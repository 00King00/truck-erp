import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TruckModel } from '../models/truck.model';
import { TruckStatus } from '../enums/truck-status.enum';

const TRUCK_NAMES = [
  'Iron Horse',
  'Thunder Road',
  'Desert Storm',
  'Night Rider',
  'Steel Titan',
  'Road Warrior',
  'Silver Bullet',
  'Black Diamond',
  'Red Baron',
  'Big Hauler',
  'Mountain King',
  'Valley Runner',
  'Coast Cruiser',
  'Prairie Wind',
  'Canyon Eagle',
  'River Fox',
  'Forest Bear',
  'Ocean Wave',
  'Sky Hawk',
  'Storm Chaser',
];

const DESCRIPTIONS = [
  'Long-haul freight carrier',
  'Refrigerated goods transport',
  'Heavy machinery hauler',
  'Construction materials carrier',
  'Express delivery unit',
  'Oversized load specialist',
  'Hazardous materials certified',
  'Intermodal container transport',
  null,
  null,
];

const STATUSES = [
  TruckStatus.OutOfService,
  TruckStatus.Loading,
  TruckStatus.ToJob,
  TruckStatus.AtJob,
  TruckStatus.Returning,
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrucks(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    const nameBase = pickRandom(TRUCK_NAMES);
    const suffix = Math.floor(Math.random() * 900) + 100;
    const description = pickRandom(DESCRIPTIONS);

    return {
      code: `TRK${String(index).padStart(3, '0')}`,
      name: `${nameBase} ${suffix}`,
      status: STATUSES[i % STATUSES.length],
      ...(description ? { description } : {}),
    };
  });
}

@Injectable()
export class TruckSeederService implements OnModuleInit {
  private readonly logger = new Logger(TruckSeederService.name);

  constructor(@Inject('TruckModel') private readonly truckModel: TruckModel) {}

  async onModuleInit(): Promise<void> {
    const count = await this.truckModel.countDocuments();
    if (count > 0) {
      this.logger.log(`DB already has ${count} trucks — skipping seed`);
      return;
    }

    const trucks = generateTrucks(100);
    await this.truckModel.insertMany(trucks);
    this.logger.log('Seeded 100 trucks');
  }
}
