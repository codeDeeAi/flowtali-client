<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useLoaders } from '@/composables/loaders.ts';
import { useFormErrors } from '@/composables/formErrors';
import { useYupForm } from '@/composables/useYupForm.ts';
import { useNotification } from '@/composables/notification.ts';
import { clientSchema } from './validation/schema.ts';
import InputField from '@/components/form/InputField.vue';
import TextArea from '@/components/form/TextArea.vue';
import { useAuthStore } from '@/stores/auth';
import { ClientService } from '@/services/client.service';
import type { ClientType } from '@/types/client.types';

const router    = useRouter();
const authStore = useAuthStore();
const { notify } = useNotification();
const { validate } = useYupForm();
const { setErrors, clearAllErrors, getError } = useFormErrors();
const { initLoaders, setLoader, getLoader } = useLoaders();

initLoaders({ isSaving: false, isLoadingForm: true });

const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '');

const clientTypes = ref<{ value: ClientType; label: string }[]>([]);

const form = ref({
  full_name: '',
  company: '',
  client_type: '' as ClientType | '',
  email: '',
  phone: '',
  address: '',
  notes: '',
});

const canSubmit = computed(() =>
  !!form.value.full_name && !!form.value.client_type
);

onMounted(async () => {
  try {
    const res = await ClientService.formData(orgId.value);
    clientTypes.value = res.data.data.client_types;
  } catch {
    // fallback to hardcoded types
    clientTypes.value = [
      { value: 'organization', label: 'Organization' },
      { value: 'individual', label: 'Individual' },
      { value: 'freelancer', label: 'Freelancer' },
      { value: 'agency', label: 'Agency' },
      { value: 'other', label: 'Other' },
    ];
  } finally {
    setLoader('isLoadingForm', false);
  }
});

const handleSubmit = async () => {
  try {
    clearAllErrors();

    const valid = await validate(clientSchema, form.value);

    if (!valid.valid) {
      setErrors(valid.errors ?? {});
      return;
    }

    setLoader('isSaving', true);

    await ClientService.create(orgId.value, {
      full_name: form.value.full_name,
      company: form.value.company || null,
      client_type: form.value.client_type as ClientType,
      email: form.value.email || null,
      phone_numbers: form.value.phone ? [form.value.phone] : null,
      address: form.value.address ? { full: form.value.address } : null,
      notes: form.value.notes || null,
    });

    notify('Client created successfully!', 'success');
    router.push({ name: 'clients' });
  } catch (error: any) {
    const msg = error?.response?.data?.message ?? 'Failed to create client.';
    notify(msg, 'error');
  } finally {
    setLoader('isSaving', false);
  }
};
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 min-h-full">

    <!-- Page header -->
    <div class="flex items-center gap-3">
      <button
        @click="router.push({ name: 'clients' })"
        class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors"
      >
        <Icon icon="lucide:arrow-left" class="w-4 h-4" />
      </button>
      <div>
        <h1 class="page-title">Add Client</h1>
        <p class="page-subtitle">Fill in the details below to add a new client</p>
      </div>
    </div>

    <!-- Loading form data -->
    <div v-if="getLoader('isLoadingForm')" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Form card -->
    <div v-else class="max-w-2xl bg-charcoal-800 border border-charcoal-700 rounded-xl p-6 space-y-6">

      <!-- Basic info -->
      <div>
        <h2 class="text-sm font-semibold text-cream mb-4">Basic Information</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              v-model="form.full_name"
              label-text="Full Name"
              type="text"
              :is-required="true"
              :error="getError('full_name').value || ''"
              input-classes="px-2 py-2 text-sm transition-colors"
              placeholder="John Doe"
            />
            <InputField
              v-model="form.company"
              label-text="Company"
              type="text"
              :error="getError('company').value || ''"
              input-classes="px-2 py-2 text-sm transition-colors"
              placeholder="Acme Inc."
            />
          </div>

          <!-- Client type -->
          <div class="space-y-1">
            <label class="flex text-sm text-cream-faint">
              <span>Client Type</span>
              <span class="text-red-400 ml-0.5">*</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="t in clientTypes" :key="t.value"
                @click="form.client_type = t.value"
                :class="[
                  'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                  form.client_type === t.value
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-charcoal-600 bg-charcoal-700/50 text-cream-faint hover:border-charcoal-500 hover:text-cream'
                ]"
              >
                {{ t.label }}
              </button>
            </div>
            <small v-if="getError('client_type').value" class="text-red-400 text-xs">{{ getError('client_type').value }}</small>
          </div>
        </div>
      </div>

      <div class="h-px bg-charcoal-700"></div>

      <!-- Contact info -->
      <div>
        <h2 class="text-sm font-semibold text-cream mb-4">Contact Details</h2>
        <div class="space-y-4">
          <InputField
            v-model="form.email"
            label-text="Email Address"
            type="email"
            :error="getError('email').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            autocomplete="email"
            autocapitalize="none"
            placeholder="john@example.com"
          />
          <InputField
            v-model="form.phone"
            label-text="Phone Number"
            type="text"
            :error="getError('phone').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            placeholder="+1 555 000 0000"
          />
          <InputField
            v-model="form.address"
            label-text="Address"
            type="text"
            :error="getError('address').value || ''"
            input-classes="px-2 py-2 text-sm transition-colors"
            placeholder="123 Main St, City, Country"
          />
        </div>
      </div>

      <div class="h-px bg-charcoal-700"></div>

      <!-- Notes -->
      <div>
        <h2 class="text-sm font-semibold text-cream mb-4">Notes</h2>
        <TextArea
          v-model="form.notes"
          label-text="Additional Notes"
          :error="getError('notes').value || ''"
          input-classes="px-2 py-2 text-sm transition-colors resize-none"
          placeholder="Any additional information about this client…"
          rows="4"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          @click="router.push({ name: 'clients' })"
          class="px-4 py-2 text-sm font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="!canSubmit || getLoader('isSaving')"
          :class="['flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors', canSubmit && !getLoader('isSaving') ? 'bg-amber hover:bg-amber-light text-charcoal-900' : 'bg-amber/50 text-charcoal-900/50 cursor-not-allowed']"
        >
          <Icon v-if="getLoader('isSaving')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
          <Icon v-else icon="lucide:user-plus" class="w-3.5 h-3.5" />
          {{ getLoader('isSaving') ? 'Saving…' : 'Add Client' }}
        </button>
      </div>
    </div>

  </div>
</template>
