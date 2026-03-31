import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TruckStatus } from '../enums/truck-status.enum';

export const ALLOWED_SORT_FIELDS = [
  'code',
  'name',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export class QueryTruckDto {
  @ApiPropertyOptional({ example: 'TRK', description: 'Partial match on code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Big', description: 'Partial match on name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    enum: TruckStatus,
    description: 'Exact status filter',
  })
  @IsEnum(TruckStatus)
  @IsOptional()
  status?: TruckStatus;

  @ApiPropertyOptional({
    example: 'haul',
    description: 'Partial match on description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: ALLOWED_SORT_FIELDS,
    example: 'createdAt',
    description: 'Field to sort by',
  })
  @IsIn(ALLOWED_SORT_FIELDS)
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
