import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TruckStatus } from '../enums/truck-status.enum';

export class UpdateTruckDto {
  @ApiPropertyOptional({
    example: 'TRK002',
    description: 'Unique alphanumeric truck code',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'code must be alphanumeric' })
  code?: string;

  @ApiPropertyOptional({ example: 'Big Blue' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TruckStatus, example: TruckStatus.Loading })
  @IsEnum(TruckStatus)
  @IsOptional()
  status?: TruckStatus;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;
}
