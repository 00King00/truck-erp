import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TruckStatus } from '../enums/truck-status.enum';

export class CreateTruckDto {
  @ApiProperty({
    example: 'TRK001',
    description: 'Unique alphanumeric truck code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'code must be alphanumeric' })
  code: string;

  @ApiProperty({ example: 'Big Red', description: 'Truck display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: TruckStatus, example: TruckStatus.OutOfService })
  @IsEnum(TruckStatus)
  status: TruckStatus;

  @ApiPropertyOptional({
    example: 'Long-haul truck',
    description: 'Optional description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
