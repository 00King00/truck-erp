<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { TruckStatus, ALL_STATUSES } from '../types/truck';
import type { Truck, CreateTruckPayload } from '../types/truck';

const props = defineProps<{
  visible: boolean;
  truck?: Truck | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  submit: [payload: CreateTruckPayload];
}>();

const form = ref<{
  code: string;
  name: string;
  status: TruckStatus;
  description: string;
}>({
  code: '',
  name: '',
  status: TruckStatus.OutOfService,
  description: '',
});
const errors = ref<Record<string, string>>({});

const isEdit = computed(() => !!props.truck);
const title = computed(() => (isEdit.value ? 'Edit Truck' : 'Create Truck'));

const statusOptions = ALL_STATUSES.map((s) => ({ label: s, value: s }));

watch(
  () => props.visible,
  (val) => {
    if (val) {
      errors.value = {};
      if (props.truck) {
        form.value = {
          code: props.truck.code,
          name: props.truck.name,
          status: props.truck.status,
          description: props.truck.description ?? '',
        };
      } else {
        form.value = {
          code: '',
          name: '',
          status: TruckStatus.OutOfService,
          description: '',
        };
      }
    }
  },
);

function validate(): boolean {
  errors.value = {};
  if (!form.value.code.trim()) errors.value.code = 'Code is required';
  else if (!/^[a-zA-Z0-9]+$/.test(form.value.code))
    errors.value.code = 'Code must be alphanumeric';
  if (!form.value.name.trim()) errors.value.name = 'Name is required';
  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validate()) return;
  const payload: CreateTruckPayload = {
    code: form.value.code.trim(),
    name: form.value.name.trim(),
    status: form.value.status,
    ...(form.value.description.trim()
      ? { description: form.value.description.trim() }
      : {}),
  };
  emit('submit', payload);
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="title"
    :style="{ width: '480px' }"
    modal
    @update:visible="emit('update:visible', $event)"
  >
    <div class="truck-form">
      <div class="truck-form__field">
        <label class="truck-form__label">Code *</label>
        <InputText
          v-model="form.code"
          :disabled="isEdit"
          class="truck-form__input"
          placeholder="e.g. TRK001"
        />
        <small v-if="errors.code" class="truck-form__error">{{
          errors.code
        }}</small>
      </div>

      <div class="truck-form__field">
        <label class="truck-form__label">Name *</label>
        <InputText
          v-model="form.name"
          class="truck-form__input"
          placeholder="e.g. Iron Horse"
        />
        <small v-if="errors.name" class="truck-form__error">{{
          errors.name
        }}</small>
      </div>

      <div class="truck-form__field">
        <label class="truck-form__label">Status *</label>
        <Select
          v-model="form.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          class="truck-form__input"
        />
      </div>

      <div class="truck-form__field">
        <label class="truck-form__label">Description</label>
        <Textarea
          v-model="form.description"
          class="truck-form__input"
          rows="3"
          auto-resize
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        text
        @click="emit('update:visible', false)"
      />
      <Button :label="isEdit ? 'Save' : 'Create'" @click="handleSubmit" />
    </template>
  </Dialog>
</template>

<style>
.truck-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}
.truck-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.truck-form__label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}
.truck-form__input {
  width: 100%;
}
.truck-form__error {
  color: #ef4444;
  font-size: 12px;
}
</style>
