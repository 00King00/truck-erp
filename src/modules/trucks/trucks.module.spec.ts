import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TrucksModule } from './trucks.module';
import { TrucksService } from './trucks.service';
import { TrucksController } from './trucks.controller';
import { TruckSeederService } from './seeds/truck.seeder';
import { Truck } from './schemas/truck.schema';

const mockModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(1),
};

describe('TrucksModule', () => {
  it('compiles and resolves all providers', async () => {
    const module = await Test.createTestingModule({
      imports: [TrucksModule],
    })
      .overrideProvider(getModelToken(Truck.name))
      .useValue(mockModel)
      .compile();

    expect(module.get(TrucksService)).toBeInstanceOf(TrucksService);
    expect(module.get(TrucksController)).toBeInstanceOf(TrucksController);
    expect(module.get(TruckSeederService)).toBeInstanceOf(TruckSeederService);
  });
});
