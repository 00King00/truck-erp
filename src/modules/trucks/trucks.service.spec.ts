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

const makeTruck = (overrides: Record<string, unknown> = {}) => ({
  _id: 'some-id',
  code: 'ABC123',
  name: 'Truck One',
  status: TruckStatus.OutOfService,
  description: '',
  ...overrides,
});

const mockModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
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

    it('rethrows unknown errors', async () => {
      const err = new Error('unexpected');
      mockModel.create.mockRejectedValue(err);
      await expect(
        service.create({ code: 'X', name: 'Y', status: TruckStatus.Loading }),
      ).rejects.toThrow(err);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated result with defaults', async () => {
      const trucks = [makeTruck(), makeTruck({ code: 'XYZ' })];
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(trucks),
      });
      mockModel.countDocuments.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data).toBe(trucks);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('applies pagination params', async () => {
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      mockModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(5);
    });

    it('applies status filter for exact match', async () => {
      const findMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(findMock);
      mockModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ status: TruckStatus.Loading });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: TruckStatus.Loading }),
      );
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

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns truck on valid payload', async () => {
      const existing = makeTruck({ status: TruckStatus.OutOfService });
      const updated = makeTruck({
        name: 'New Name',
        status: TruckStatus.OutOfService,
      });

      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.update('some-id', { name: 'New Name' });
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when truck not found on update', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when findByIdAndUpdate returns null', async () => {
      const existing = makeTruck();
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.update('some-id', { name: 'X' })).rejects.toThrow(
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
      const existing = makeTruck({ status: from });
      const updated = makeTruck({ status: to });

      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      await expect(
        service.update('some-id', { status: to }),
      ).resolves.toBeDefined();
    });

    it.each(invalidTransitions)('rejects %s → %s', async (from, to) => {
      const existing = makeTruck({ status: from });
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      await expect(service.update('some-id', { status: to })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('skips transition check when status is unchanged', async () => {
      const existing = makeTruck({ status: TruckStatus.Loading });
      const updated = makeTruck({ status: TruckStatus.Loading, name: 'New' });

      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      await expect(
        service.update('some-id', { status: TruckStatus.Loading, name: 'New' }),
      ).resolves.toBeDefined();
    });
  });
});
