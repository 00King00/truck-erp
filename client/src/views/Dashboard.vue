<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Paginator from 'primevue/paginator';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ProgressSpinner from 'primevue/progressspinner';
import TruckFormModal from '../components/TruckFormModal.vue';
import { TruckStatus, VALID_TRANSITIONS, ALL_STATUSES } from '../types/truck';
import type { Truck, CreateTruckPayload, TruckFilters } from '../types/truck';
import {
  fetchTrucks,
  createTruck,
  updateTruck,
  deleteTruck,
} from '../api/trucks';

const confirm = useConfirm();
const toast = useToast();
const queryClient = useQueryClient();

const filters = ref<TruckFilters>({
  code: '',
  name: '',
  status: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
});

const activeFilters = computed(() => {
  const f: TruckFilters = { ...filters.value };
  if (!f.code) delete f.code;
  if (!f.name) delete f.name;
  if (!f.status) delete f.status;
  return f;
});

const { data, isLoading, isError } = useQuery({
  queryKey: computed(() => ['trucks', activeFilters.value]),
  queryFn: () => fetchTrucks(activeFilters.value),
  staleTime: 30_000,
});

const trucks = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);

// Reset to page 1 when filters change
watch(
  () => ({ ...filters.value, page: undefined }),
  () => {
    filters.value.page = 1;
  },
);

// Form modal
const formVisible = ref(false);
const editingTruck = ref<Truck | null>(null);

function openCreate() {
  editingTruck.value = null;
  formVisible.value = true;
}

function openEdit(truck: Truck) {
  editingTruck.value = truck;
  formVisible.value = true;
}

// Status change dropdown
const statusOptions = computed(
  () => (truck: Truck) =>
    ALL_STATUSES.map((s) => ({
      label: s,
      value: s,
      disabled:
        s !== truck.status && !VALID_TRANSITIONS[truck.status]?.includes(s),
    })),
);

// Mutations
const createMutation = useMutation({
  mutationFn: (payload: CreateTruckPayload) => createTruck(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trucks'] });
    formVisible.value = false;
    toast.add({
      severity: 'success',
      summary: 'Created',
      detail: 'Truck created',
      life: 3000,
    });
  },
  onError: (err: unknown) => {
    const msg = extractErrorMessage(err);
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });
  },
});

const updateMutation = useMutation({
  mutationFn: ({ id, payload }: { id: string; payload: CreateTruckPayload }) =>
    updateTruck(id, payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trucks'] });
    formVisible.value = false;
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: 'Truck updated',
      life: 3000,
    });
  },
  onError: (err: unknown) => {
    const msg = extractErrorMessage(err);
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });
  },
});

const statusMutation = useMutation({
  mutationFn: ({ id, status }: { id: string; status: TruckStatus }) =>
    updateTruck(id, { status }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trucks'] });
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: 'Status changed',
      life: 3000,
    });
  },
  onError: (err: unknown) => {
    const msg = extractErrorMessage(err);
    toast.add({
      severity: 'error',
      summary: 'Invalid transition',
      detail: msg,
      life: 4000,
    });
    queryClient.invalidateQueries({ queryKey: ['trucks'] });
  },
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteTruck(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['trucks'] });
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Truck deleted',
      life: 3000,
    });
  },
  onError: (err: unknown) => {
    const msg = extractErrorMessage(err);
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });
  },
});

function handleFormSubmit(payload: CreateTruckPayload) {
  if (editingTruck.value) {
    updateMutation.mutate({ id: editingTruck.value._id, payload });
  } else {
    createMutation.mutate(payload);
  }
}

function handleStatusChange(truck: Truck, newStatus: TruckStatus) {
  if (newStatus === truck.status) return;
  statusMutation.mutate({ id: truck._id, status: newStatus });
}

function handleDelete(truck: Truck) {
  confirm.require({
    message: `Delete truck "${truck.code} — ${truck.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: () => deleteMutation.mutate(truck._id),
  });
}

function onPageChange(event: { page: number; rows: number }) {
  filters.value.page = event.page + 1;
  filters.value.limit = event.rows;
}

function extractErrorMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: unknown }).response === 'object'
  ) {
    const res = (err as { response: { data?: { message?: string } } }).response;
    return res.data?.message ?? 'Something went wrong';
  }
  return 'Something went wrong';
}

const sortOrderOptions = [
  { label: 'Newest first', value: 'desc' },
  { label: 'Oldest first', value: 'asc' },
];

const statusFilterOptions = [
  { label: 'All statuses', value: '' },
  ...ALL_STATUSES.map((s) => ({ label: s, value: s })),
];
</script>

<template>
  <div class="dashboard">
    <Toast />
    <ConfirmDialog />

    <div class="dashboard__header">
      <h1 class="dashboard__title">Truck Fleet</h1>
      <Button label="Add Truck" icon="pi pi-plus" @click="openCreate" />
    </div>

    <!-- Filters -->
    <div class="dashboard__filters">
      <InputText
        v-model="filters.code"
        placeholder="Filter by code"
        class="dashboard__filter-input"
      />
      <InputText
        v-model="filters.name"
        placeholder="Filter by name"
        class="dashboard__filter-input"
      />
      <Select
        v-model="filters.status"
        :options="statusFilterOptions"
        option-label="label"
        option-value="value"
        class="dashboard__filter-input"
      />
      <Select
        v-model="filters.sortOrder"
        :options="sortOrderOptions"
        option-label="label"
        option-value="value"
        class="dashboard__filter-input"
      />
    </div>

    <!-- Loading / Error -->
    <div v-if="isLoading" class="dashboard__loading">
      <ProgressSpinner />
      <p>Connecting to server…</p>
    </div>

    <div v-else-if="isError" class="dashboard__error">
      Failed to load trucks. Check your connection or JWT token.
    </div>

    <!-- Table -->
    <DataTable v-else :value="trucks" class="dashboard__table" striped-rows>
      <Column field="code" header="Code" sortable />
      <Column field="name" header="Name" sortable />
      <Column header="Status">
        <template #body="{ data: truck }">
          <Select
            :model-value="truck.status"
            :options="statusOptions(truck)"
            option-label="label"
            option-value="value"
            :option-disabled="(opt: { disabled: boolean }) => opt.disabled"
            class="dashboard__status-select"
            @update:model-value="
              (val: TruckStatus) => handleStatusChange(truck, val)
            "
          />
        </template>
      </Column>
      <Column field="description" header="Description">
        <template #body="{ data: truck }">
          <span class="dashboard__description">{{
            truck.description ?? '—'
          }}</span>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data: truck }">
          <div class="dashboard__actions">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              @click="openEdit(truck)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              @click="handleDelete(truck)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Paginator -->
    <Paginator
      v-if="total > 0"
      :rows="filters.limit ?? 10"
      :total-records="total"
      :first="((filters.page ?? 1) - 1) * (filters.limit ?? 10)"
      :rows-per-page-options="[10, 25, 50]"
      class="dashboard__paginator"
      @page="onPageChange"
    />

    <TruckFormModal
      v-model:visible="formVisible"
      :truck="editingTruck"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<style>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.dashboard__title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}
.dashboard__filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.dashboard__filter-input {
  width: 200px;
}
.dashboard__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #6b7280;
}
.dashboard__error {
  padding: 24px;
  color: #ef4444;
  text-align: center;
}
.dashboard__table {
  width: 100%;
}
.dashboard__status-select {
  width: 160px;
}
.dashboard__description {
  color: #6b7280;
  font-size: 13px;
}
.dashboard__actions {
  display: flex;
  gap: 4px;
}
.dashboard__paginator {
  margin-top: 16px;
}
</style>
