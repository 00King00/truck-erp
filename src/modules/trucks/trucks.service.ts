import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Truck, TruckDocument } from './schemas/truck.schema';
import { TruckStatus } from './enums/truck-status.enum';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { QueryTruckDto } from './dto/query-truck.dto';

const VALID_TRANSITIONS: Record<TruckStatus, TruckStatus[]> = {
  [TruckStatus.OutOfService]: [
    TruckStatus.Loading,
    TruckStatus.ToJob,
    TruckStatus.AtJob,
    TruckStatus.Returning,
    TruckStatus.OutOfService,
  ],
  [TruckStatus.Loading]: [TruckStatus.ToJob, TruckStatus.OutOfService],
  [TruckStatus.ToJob]: [TruckStatus.AtJob, TruckStatus.OutOfService],
  [TruckStatus.AtJob]: [TruckStatus.Returning, TruckStatus.OutOfService],
  [TruckStatus.Returning]: [TruckStatus.Loading, TruckStatus.OutOfService],
};

@Injectable()
export class TrucksService {
  constructor(
    @InjectModel(Truck.name) private readonly truckModel: Model<TruckDocument>,
  ) {}

  async create(dto: CreateTruckDto): Promise<TruckDocument> {
    try {
      return await this.truckModel.create(dto);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: number }).code === 11000
      ) {
        throw new ConflictException(
          `Truck with code "${dto.code}" already exists`,
        );
      }
      throw err;
    }
  }

  async findAll(query: QueryTruckDto): Promise<TruckDocument[]> {
    const {
      code,
      name,
      status,
      description,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const filter: Record<string, any> = {};

    if (code) filter.code = { $regex: code, $options: 'i' };
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (description)
      filter.description = { $regex: description, $options: 'i' };
    if (status) filter.status = status;

    return this.truckModel
      .find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<TruckDocument> {
    const truck = await this.truckModel.findById(id).exec();
    if (!truck) throw new NotFoundException(`Truck ${id} not found`);
    return truck;
  }

  async update(id: string, dto: UpdateTruckDto): Promise<TruckDocument> {
    const truck = await this.findOne(id);

    if (dto.status && dto.status !== truck.status) {
      if (!this.isValidTransition(truck.status, dto.status)) {
        throw new UnprocessableEntityException(
          `Invalid status transition: ${truck.status} → ${dto.status}`,
        );
      }
    }

    Object.assign(truck, dto);
    return truck.save();
  }

  async remove(id: string): Promise<void> {
    const truck = await this.truckModel.findByIdAndDelete(id).exec();
    if (!truck) throw new NotFoundException(`Truck ${id} not found`);
  }

  private isValidTransition(from: TruckStatus, to: TruckStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }
}
