export const TruckStatus = {
  OutOfService: 'Out Of Service',
  Loading: 'Loading',
  ToJob: 'To Job',
  AtJob: 'At Job',
  Returning: 'Returning',
} as const;

export type TruckStatus = (typeof TruckStatus)[keyof typeof TruckStatus];

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

export const ALL_STATUSES = Object.values(TruckStatus);

export interface Truck {
  _id: string;
  code: string;
  name: string;
  status: TruckStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TruckListResponse {
  data: Truck[];
  total: number;
  page: number;
  limit: number;
}

export interface TruckFilters {
  code?: string;
  name?: string;
  status?: TruckStatus | '';
  description?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateTruckPayload {
  code: string;
  name: string;
  status: TruckStatus;
  description?: string;
}

export type UpdateTruckPayload = Partial<CreateTruckPayload>;
