import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TrucksService } from './trucks.service';
import { CreateTruckDto, UpdateTruckDto, QueryTruckDto } from './dto';

@ApiTags('trucks')
@ApiBearerAuth()
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Post()
  create(@Body() dto: CreateTruckDto) {
    return this.trucksService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTruckDto) {
    return this.trucksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trucksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTruckDto) {
    return this.trucksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.trucksService.remove(id);
  }
}
