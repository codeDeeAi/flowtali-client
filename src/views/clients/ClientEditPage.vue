<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useLoaders } from '@/composables/loaders.ts';
import { useFormErrors } from '@/composables/formErrors';
import { useYupForm } from '@/composables/useYupForm.ts';
import { useNotification } from '@/composables/notification.ts';
import { clientSchema } from './validation/schema.ts';
import InputField from '@/components/form/InputField.vue';
import TextArea from '@/components/form/TextArea.vue';

const router = useRouter();
const route = useRoute();
const { notify } = useNotification();
const { validate } = useYupForm();
const { setErrors, clearAllErrors, getError } = useFormErrors();
const { initLoaders, setLoader, getLoader } = useLoaders();

initLoaders({ isSaving: false, isLoading: true });

// Mock data — in a real app this would be fetched by ID
const mockClients = [
  { id: 1, name: 'James Johnson',   company: 'Globex Corporation', email: 'james@globex.com',    phone: '+1 212 555 0100',  type: 'B2B' as const, address: '123 Broadway, New York, NY', notes: 'Key enterprise account.' },
  { id: 2, name: 'Sofia Martinez',  company: 'Pixel Works Ltd',    email: 'sofia@pixelworks.io', phone: '+44 20 7946 0958', type: 'B2B' as const, address: '10 Downing St, London',        notes: '' },
  { id: 3, name: 'Kofi Acheampong', company: 'Nova Agency',        email: 'kofi@nova.co',        phone: '+233 30 295 0100', type: 'B2B' as const, address: 'Accra, Ghana',                notes: '' },
  { id: 4, name: 'Priya Nair',      company: 'Freelance',          email: 'priya@mail.com',      phone: '+91 98765 43210',  type: 'B2C' as const, address: 'Mumbai, India',               notes: 'Prefers invoices in USD.' },
  { id: 5, name: 'Marcus Bell',     company: 'Studio X',           email: 'marcus@studiox.co',   phone: '+1 415 555 0199',  type: 'B2B' as const, address: 'San Francisco, CA',           notes: '' },
  { id: 6, name: 'Chen Wei',        company: 'Frontier Tech',      email: 'chen@frontier.tech',  phone: '+86 10 6552 9988', type: 'B2B' as const, address: 'Beijing, China',              notes: '' },
];

const form = ref({
  name: '',
  company: '',
  email: '',
  phone: '',
  type: '' as 'B2B' | 'B2C' | '',
  address: '',
  notes: '',
});

const notFound = ref(false);

onMounted(async () => {
  // Simulate fetch
  await new Promise(resolve => setTimeout(resolve, 400));

  const id = Number(route.params.id);
  const client = mockClients.find(c => c.id === id);

  if (!client) {
    notFound.value = true;
    setLoader('isLoading', false);
    return;
  }

  form.value = {
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    type: client.type,
    address: client.address,
    notes: client.notes,
  };

  setLoader('isLoading', false);
});

const canSubmit = computed(() =>
  !!form.value.name && !!form.value.email && !!form.value.type
);

const handleSubmit = async () => {
  try {
    clearAllErrors();

    const valid = await validate(clientSchema, form.value);

    if (!valid.valid) {
      setErrors(valid.errors ?? {});
      return;
    }

    setLoader('isSaving', true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));

    notify('Client updated successfully!', 'success');
    router.push({ name: 'clients' });
  } catch (error) {
    console.log('Edit client error:', error);
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
        <h1 class="page-title">Edit Client</h1>
        <p class="page-subtitle">Update the details for this client</p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="getLoader('isLoading')" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:user-x" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">Client not found</p>
      <button @click="router.push({ name: 'clients' })" class="mt-4 text-amber text-sm hover:underline">
        Back to clients
      </button>
    </div>

    <!-- Form card -->
    <div v-else class="max-w-2xl bg-charcoal-800 border border-charcoal-700 rounded-xl p-6 space-y-6">

      <!-- Basic info -->
      <div>
        <h2 class="text-sm font-semibold text-cream mb-4">Basic Information</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              v-model="form.name"
              label-text="Full Name"
              type="text"
              :is-required="true"
              :error="getError('name').value || ''"
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
            <div class="flex gap-3">
              <button
                v-for="t in ['B2B', 'B2C']" :key="t"
                @click="form.type = t as 'B2B' | 'B2C'"
                :class="[
                  'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  form.type === t
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-charcoal-600 bg-charcoal-700/50 text-cream-faint hover:border-charcoal-500 hover:text-cream'
                ]"
              >
                {{ t }}
              </button>
            </div>
            <small v-if="getError('type').value" class="text-red-400 text-xs">{{ getError('type').value }}</small>
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
            :is-required="true"
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
          <Icon v-else icon="lucide:save" class="w-3.5 h-3.5" />
          {{ getLoader('isSaving') ? 'Saving…' : 'Save Changes' }}
        </button>
      </div>
    </div>

  </div>
</template>
