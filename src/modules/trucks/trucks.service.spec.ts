import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { Truck } from './schemas/truck.schema';
import { TruckStatus } from './enums/truck-status.enum';

const makeTruck = (overrides: Partial<any> = {}) => ({
  _id: 'some-id',
  code: 'ABC123',
  name: 'Truck One',
  status: TruckStatus.OutOfService,
  description: '',
  save: jest.fn().mockResolvedValue({ ...overrides }),
  ...overrides,
});

const mockModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

describe('TrucksService', () => {
  let service: TrucksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrucksService,
        { provide: getModelToken(Truck.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<TrucksService>(TrucksService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns a truck', async () => {
      const truck = makeTruck();
      mockModel.create.mockResolvedValue(truck);
      const result = await service.create({
        code: 'ABC123',
        name: 'Truck One',
        status: TruckStatus.OutOfService,
      });
      expect(result).toBe(truck);
    });

    it('throws ConflictException on duplicate code (mongo 11000)', async () => {
      mockModel.create.mockRejectedValue({ code: 11000 });
      await expect(
        service.create({
          code: 'ABC123',
          name: 'Truck One',
          status: TruckStatus.OutOfService,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns truck when found', async () => {
      const truck = makeTruck();
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(truck),
      });
      await expect(service.findOne('some-id')).resolves.toBe(truck);
    });

    it('throws NotFoundException when not found', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes successfully when truck exists', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeTruck()),
      });
      await expect(service.remove('some-id')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when truck does not exist', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── status transitions ───────────────────────────────────────────────────

  describe('update — status transitions', () => {
    const validTransitions: [TruckStatus, TruckStatus][] = [
      [TruckStatus.OutOfService, TruckStatus.Loading],
      [TruckStatus.OutOfService, TruckStatus.ToJob],
      [TruckStatus.OutOfService, TruckStatus.AtJob],
      [TruckStatus.OutOfService, TruckStatus.Returning],
      [TruckStatus.Loading, TruckStatus.ToJob],
      [TruckStatus.Loading, TruckStatus.OutOfService],
      [TruckStatus.ToJob, TruckStatus.AtJob],
      [TruckStatus.ToJob, TruckStatus.OutOfService],
      [TruckStatus.AtJob, TruckStatus.Returning],
      [TruckStatus.AtJob, TruckStatus.OutOfService],
      [TruckStatus.Returning, TruckStatus.Loading],
      [TruckStatus.Returning, TruckStatus.OutOfService],
    ];

    const invalidTransitions: [TruckStatus, TruckStatus][] = [
      [TruckStatus.Loading, TruckStatus.AtJob],
      [TruckStatus.Loading, TruckStatus.Returning],
      [TruckStatus.ToJob, TruckStatus.Loading],
      [TruckStatus.ToJob, TruckStatus.Returning],
      [TruckStatus.AtJob, TruckStatus.Loading],
      [TruckStatus.AtJob, TruckStatus.ToJob],
      [TruckStatus.Returning, TruckStatus.ToJob],
      [TruckStatus.Returning, TruckStatus.AtJob],
    ];

    it.each(validTransitions)('allows %s → %s', async (from, to) => {
      const truck = makeTruck({ status: from });
      truck.save.mockResolvedValue({ ...truck, status: to });
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(truck),
      });
      await expect(
        service.update('some-id', { status: to }),
      ).resolves.toBeDefined();
    });

    it.each(invalidTransitions)('rejects %s → %s', async (from, to) => {
      const truck = makeTruck({ status: from });
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(truck),
      });
      await expect(service.update('some-id', { status: to })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
