import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TruckStatus } from '../enums/truck-status.enum';

export type TruckDocument = HydratedDocument<Truck>;

@Schema({ timestamps: true })
export class Truck {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: TruckStatus })
  status: TruckStatus;

  @Prop()
  description?: string;
}

export const TruckSchema = SchemaFactory.createForClass(Truck);
