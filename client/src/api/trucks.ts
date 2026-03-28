import axios from 'axios';
import type {
  Truck,
  TruckFilters,
  CreateTruckPayload,
  UpdateTruckPayload,
} from '../types/truck';

const api = axios.create({
  baseURL: `${(import.meta.env.VITE_API_URL as string) || ''}/api`,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_JWT_TOKEN ?? ''}`,
  },
});

export interface TruckListResult {
  data: Truck[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchTrucks(
  filters: TruckFilters,
): Promise<TruckListResult> {
  const params: Record<string, unknown> = {};
  if (filters.code) params.code = filters.code;
  if (filters.name) params.name = filters.name;
  if (filters.status) params.status = filters.status;
  if (filters.description) params.description = filters.description;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const res = await api.get<TruckListResult>('/trucks', { params });
  return res.data;
}

export async function fetchTruck(id: string): Promise<Truck> {
  const res = await api.get<Truck>(`/trucks/${id}`);
  return res.data;
}

export async function createTruck(payload: CreateTruckPayload): Promise<Truck> {
  const res = await api.post<Truck>('/trucks', payload);
  return res.data;
}

export async function updateTruck(
  id: string,
  payload: UpdateTruckPayload,
): Promise<Truck> {
  const res = await api.patch<Truck>(`/trucks/${id}`, payload);
  return res.data;
}

export async function deleteTruck(id: string): Promise<void> {
  await api.delete(`/trucks/${id}`);
}
