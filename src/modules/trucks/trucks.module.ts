import { Module } from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { TrucksController } from './trucks.controller';
import { TruckSeederService } from './seeds/truck.seeder';
import { truckModelProvider } from './models/truck.model';

@Module({
  controllers: [TrucksController],
  providers: [truckModelProvider, TrucksService, TruckSeederService],
})
export class TrucksModule {}
