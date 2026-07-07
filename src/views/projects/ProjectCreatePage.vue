<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { ProjectService } from '@/services/project.service';
import { useNotification } from '@/composables/notification';

const router    = useRouter();
const authStore = useAuthStore();
const { notify } = useNotification();

const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '');

const isSaving   = ref(false);
const isLoading  = ref(true);
const clients    = ref<{ id: string; name: string; company: string | null }[]>([]);
const currencies = ref<string[]>(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN']);

const form = ref({
  number:          '',
  title:           '',
  description:     '',
  client_id:       '',
  status:          'draft',
  status_tracking: 'manual',
  currency:        'USD',
  contract_value:  '',
  start_date:      '',
  end_date:        '',
});

onMounted(async () => {
  try {
    const res = await ProjectService.draftData(orgId.value);
    const data = res.data.data;
    clients.value    = data.clients as any ?? [];
    currencies.value = data.currencies as any ?? currencies.value;
    if (data.default_currency) form.value.currency = data.default_currency;
  } catch {
    // non-critical, form still works
  } finally {
    isLoading.value = false;
  }
});

const STATUSES = [
  { value: 'draft',     label: 'Draft',     desc: 'Not yet started',         color: 'text-gray-900' },
  { value: 'active',    label: 'Active',    desc: 'Currently in progress',   color: 'text-green-400' },
  { value: 'on_hold',   label: 'On Hold',   desc: 'Temporarily paused',      color: 'text-green-700' },
  { value: 'completed', label: 'Completed', desc: 'Successfully finished',   color: 'text-blue-400' },
  { value: 'cancelled', label: 'Cancelled', desc: 'No longer proceeding',    color: 'text-red-400' },
];

async function handleSubmit() {
  if (!form.value.number.trim()) { notify('Project number is required.', 'error'); return; }
  if (!form.value.title.trim())  { notify('Project title is required.', 'error');  return; }

  isSaving.value = true;
  try {
    const payload: Record<string, any> = {
      number:          form.value.number.trim(),
      title:           form.value.title.trim(),
      description:     form.value.description || null,
      client_id:       form.value.client_id || null,
      status:          form.value.status,
      status_tracking: form.value.status_tracking,
      currency:        form.value.currency,
      contract_value:  form.value.contract_value ? parseFloat(form.value.contract_value) : null,
      start_date:      form.value.start_date || null,
      end_date:        form.value.end_date || null,
    };
    const res = await ProjectService.create(orgId.value, payload);
    notify('Project created.', 'success');
    router.push({ name: 'projects.view', params: { id: res.data.data.id } });
  } catch (err: any) {
    notify(err?.response?.data?.message ?? 'Failed to create project.', 'error');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="p-4 md:p-6 min-h-full">
    <div class="max-w-3xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <button
          @click="router.push({ name: 'projects' })"
          class="p-2 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors shrink-0"
        >
          <Icon icon="lucide:arrow-left" class="w-4 h-4" />
        </button>
        <div>
          <h1 class="page-title">New Project</h1>
          <p class="page-subtitle">Track invoices, receipts, and files under one project</p>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <Icon icon="lucide:loader-2" class="w-5 h-5 text-gray-700 animate-spin" />
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-5">

        <!-- ── Core identity ─────────────────────────────────────── -->
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 space-y-4">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-700">Project Identity</h2>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="app-label">Number <span class="text-red-400">*</span></label>
              <input v-model="form.number" class="app-inp" placeholder="PRJ-001" required />
            </div>
            <div class="sm:col-span-2">
              <label class="app-label">Title <span class="text-red-400">*</span></label>
              <input v-model="form.title" class="app-inp" placeholder="e.g. Website Redesign for Acme Corp" required />
            </div>
          </div>

          <div>
            <label class="app-label">Description</label>
            <textarea
              v-model="form.description"
              class="app-inp resize-none"
              rows="3"
              placeholder="Scope, goals, or notes about this project…"
            />
          </div>

          <div>
            <label class="app-label">Client</label>
            <select v-model="form.client_id" class="app-inp">
              <option value="">No client assigned</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.name }}{{ c.company ? ` — ${c.company}` : '' }}
              </option>
            </select>
          </div>
        </div>

        <!-- ── Status & tracking ─────────────────────────────────── -->
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 space-y-4">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-700">Status</h2>

          <div>
            <label class="app-label mb-2">Initial Status</label>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                v-for="s in STATUSES" :key="s.value"
                type="button"
                @click="form.status = s.value"
                :class="[
                  'flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors',
                  form.status === s.value
                    ? 'border-green-700/40 bg-green-700/6'
                    : 'border-gray-500 hover:border-gray-500',
                ]"
              >
                <span :class="['text-xs font-semibold', form.status === s.value ? 'text-green-700' : s.color]">{{ s.label }}</span>
                <span class="text-[10px] text-gray-700 mt-0.5 leading-tight">{{ s.desc }}</span>
              </button>
            </div>
          </div>

          <div>
            <label class="app-label mb-2">Status Tracking</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.status_tracking = 'manual'"
                :class="[
                  'flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors',
                  form.status_tracking === 'manual' ? 'border-green-700/40 bg-green-700/6' : 'border-gray-500 hover:border-gray-500',
                ]"
              >
                <Icon icon="lucide:hand" class="w-4 h-4 mt-0.5 shrink-0" :class="form.status_tracking === 'manual' ? 'text-green-700' : 'text-gray-700'" />
                <div>
                  <div class="text-xs font-semibold" :class="form.status_tracking === 'manual' ? 'text-green-700' : 'text-gray-900'">Manual</div>
                  <div class="text-[10px] text-gray-700 mt-0.5">You control status changes</div>
                </div>
              </button>
              <button
                type="button"
                @click="form.status_tracking = 'auto'"
                :class="[
                  'flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors',
                  form.status_tracking === 'auto' ? 'border-green-700/40 bg-green-700/6' : 'border-gray-500 hover:border-gray-500',
                ]"
              >
                <Icon icon="lucide:zap" class="w-4 h-4 mt-0.5 shrink-0" :class="form.status_tracking === 'auto' ? 'text-green-700' : 'text-gray-700'" />
                <div>
                  <div class="text-xs font-semibold" :class="form.status_tracking === 'auto' ? 'text-green-700' : 'text-gray-900'">Auto</div>
                  <div class="text-[10px] text-gray-700 mt-0.5">Updates based on payments</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Financials & timeline ──────────────────────────────── -->
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 space-y-4">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-700">Financials & Timeline</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="app-label">Currency</label>
              <select v-model="form.currency" class="app-inp">
                <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label class="app-label">Contract Value</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-700 font-medium">{{ form.currency }}</span>
                <input
                  v-model="form.contract_value"
                  type="number"
                  min="0"
                  step="0.01"
                  class="app-inp pl-12"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="app-label">Start Date</label>
              <input v-model="form.start_date" type="date" class="app-inp" />
            </div>
            <div>
              <label class="app-label">End Date</label>
              <input v-model="form.end_date" type="date" class="app-inp" />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            @click="router.push({ name: 'projects' })"
            class="px-4 py-2 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 hover:text-gray-1000 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon v-if="isSaving" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ isSaving ? 'Creating…' : 'Create Project' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>
