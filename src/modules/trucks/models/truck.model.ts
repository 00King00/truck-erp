import { Model } from 'mongoose';
import { Truck, TruckDocument, TruckSchema } from '../schemas/truck.schema';
import { createModelProvider } from '../../../common/utils/create-model-provider';

export type TruckModel = Model<TruckDocument>;

export const truckModelProvider = createModelProvider<TruckDocument>(
  Truck,
  TruckSchema,
);
