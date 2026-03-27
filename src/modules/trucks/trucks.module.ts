import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Truck, TruckSchema } from './schemas/truck.schema';
import { TrucksService } from './trucks.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Truck.name, schema: TruckSchema }]),
  ],
  providers: [TrucksService],
  exports: [TrucksService],
})
export class TrucksModule {}
