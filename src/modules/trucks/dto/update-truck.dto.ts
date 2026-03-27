import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { TruckStatus } from '../enums/truck-status.enum';

export class UpdateTruckDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'code must be alphanumeric' })
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TruckStatus)
  @IsOptional()
  status?: TruckStatus;

  @IsString()
  @IsOptional()
  description?: string;
}
