import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TruckDocument } from './schemas/truck.schema';
import { TruckModel } from './models/truck.model';
import { TruckStatus } from './enums/truck-status.enum';
import { CreateTruckDto, UpdateTruckDto, QueryTruckDto } from './dto';
import { VALID_TRANSITIONS } from './constants/truck-status-transitions';

@Injectable()
export class TrucksService {
  constructor(@Inject('TruckModel') private readonly truckModel: TruckModel) {}

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

  async findAll(query: QueryTruckDto): Promise<{
    data: TruckDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
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

    const filter: Record<string, unknown> = {};

    if (code) filter.code = { $regex: code, $options: 'i' };
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (description)
      filter.description = { $regex: description, $options: 'i' };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.truckModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.truckModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
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

    const updated = await this.truckModel
      .findByIdAndUpdate(
        id,
        { $set: dto },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    if (!updated) throw new NotFoundException(`Truck ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const truck = await this.truckModel.findByIdAndDelete(id).exec();
    if (!truck) throw new NotFoundException(`Truck ${id} not found`);
  }

  private isValidTransition(from: TruckStatus, to: TruckStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }
}
