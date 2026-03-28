import { Test, TestingModule } from '@nestjs/testing';
import { TrucksController } from './trucks.controller';
import { TrucksService } from './trucks.service';
import { TruckStatus } from './enums/truck-status.enum';
import type { CreateTruckDto } from './dto/create-truck.dto';
import type { UpdateTruckDto } from './dto/update-truck.dto';
import type { QueryTruckDto } from './dto/query-truck.dto';
import type { TruckDocument } from './schemas/truck.schema';

const mockService: jest.Mocked<TrucksService> = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<TrucksService>;

const fakeTruck = {
  _id: 'abc',
  code: 'TRK001',
  name: 'Iron Horse',
  status: TruckStatus.OutOfService,
} as unknown as TruckDocument;

describe('TrucksController', () => {
  let controller: TrucksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrucksController],
      providers: [{ provide: TrucksService, useValue: mockService }],
    }).compile();

    controller = module.get<TrucksController>(TrucksController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to service.create and returns result', async () => {
      mockService.create.mockResolvedValue(fakeTruck);
      const dto: CreateTruckDto = {
        code: 'TRK001',
        name: 'Iron Horse',
        status: TruckStatus.OutOfService,
      };
      const result = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(fakeTruck);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll and returns result', async () => {
      const paginated = { data: [fakeTruck], total: 1, page: 1, limit: 10 };
      mockService.findAll.mockResolvedValue(paginated);
      const query: QueryTruckDto = { page: 1, limit: 10 };
      const result = await controller.findAll(query);
      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with id', async () => {
      mockService.findOne.mockResolvedValue(fakeTruck);
      const result = await controller.findOne('abc');
      expect(mockService.findOne).toHaveBeenCalledWith('abc');
      expect(result).toBe(fakeTruck);
    });
  });

  describe('update', () => {
    it('delegates to service.update with id and dto', async () => {
      const updated = {
        ...fakeTruck,
        name: 'Updated',
      } as unknown as TruckDocument;
      mockService.update.mockResolvedValue(updated);
      const dto: UpdateTruckDto = { name: 'Updated' };
      const result = await controller.update('abc', dto);
      expect(mockService.update).toHaveBeenCalledWith('abc', dto);
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('delegates to service.remove with id', async () => {
      mockService.remove.mockResolvedValue(undefined);
      await controller.remove('abc');
      expect(mockService.remove).toHaveBeenCalledWith('abc');
    });
  });
});
