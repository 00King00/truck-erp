import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { TruckStatus } from '../enums/truck-status.enum';

export class CreateTruckDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'code must be alphanumeric' })
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TruckStatus)
  status: TruckStatus;

  @IsString()
  @IsOptional()
  description?: string;
}
