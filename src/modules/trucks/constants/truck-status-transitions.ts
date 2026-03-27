import { TruckStatus } from '../enums/truck-status.enum';

export const VALID_TRANSITIONS: Record<TruckStatus, TruckStatus[]> = {
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
