<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { ProjectService } from '@/services/project.service';
import { ClientService } from '@/services/client.service';
import { useNotification } from '@/composables/notification';
import type { IProject } from '@/services/project.service';
import type { IClient } from '@/types/client.types';

const router    = useRouter();
const route     = useRoute();
const authStore = useAuthStore();
const { notify } = useNotification();

const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '');
const projectId = route.params.id as string;

const project   = ref<IProject | null>(null);
const clients   = ref<IClient[]>([]);
const isSaving  = ref(false);
const loading   = ref(true);

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
    const [projRes, clientRes] = await Promise.all([
      ProjectService.get(orgId.value, projectId),
      ClientService.list(orgId.value, { per_page: 200 }),
    ]);
    project.value = projRes.data.data;
    clients.value = clientRes.data.data.data;

    const p = project.value;
    form.value = {
      number:          p.number,
      title:           p.title,
      description:     p.description ?? '',
      client_id:       p.client?.id ?? '',
      status:          p.status,
      status_tracking: p.status_tracking,
      currency:        p.currency,
      contract_value:  p.contract_value != null ? String(p.contract_value) : '',
      start_date:      p.start_date ?? '',
      end_date:        p.end_date ?? '',
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      notify('Project not found.', 'error');
      router.push({ name: 'projects' });
    } else {
      notify('Failed to load project.', 'error');
      router.push({ name: 'projects' });
    }
  } finally {
    loading.value = false;
  }
});

async function handleSubmit() {
  if (!form.value.number.trim() || !form.value.title.trim()) {
    notify('Number and title are required.', 'error');
    return;
  }
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
    await ProjectService.update(orgId.value, projectId, payload);
    notify('Project updated.', 'success');
    router.push({ name: 'projects.view', params: { id: projectId } });
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'Failed to update project.';
    notify(msg, 'error');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-center gap-3">
      <button @click="router.push({ name: 'projects.view', params: { id: projectId } })" class="p-1.5 rounded-md hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
        <Icon icon="lucide:arrow-left" class="w-4 h-4" />
      </button>
      <div>
        <h1 class="page-title">Edit Project</h1>
        <p class="page-subtitle">{{ project?.number }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Number + Title -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="app-label">Project Number <span class="text-red-400">*</span></label>
          <input v-model="form.number" class="app-inp" placeholder="PRJ-001" required />
        </div>
        <div>
          <label class="app-label">Title <span class="text-red-400">*</span></label>
          <input v-model="form.title" class="app-inp" placeholder="Website Redesign" required />
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="app-label">Description</label>
        <textarea v-model="form.description" class="app-inp resize-none" rows="3" placeholder="Optional project description…" />
      </div>

      <!-- Client -->
      <div>
        <label class="app-label">Client</label>
        <select v-model="form.client_id" class="app-inp">
          <option value="">No client</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.full_name }}{{ c.company ? ` (${c.company})` : '' }}</option>
        </select>
      </div>

      <!-- Status + Tracking -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="app-label">Status</label>
          <select v-model="form.status" class="app-inp">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label class="app-label">Status Tracking</label>
          <select v-model="form.status_tracking" class="app-inp">
            <option value="manual">Manual</option>
            <option value="auto">Auto (based on payments)</option>
          </select>
        </div>
      </div>

      <!-- Currency + Contract Value -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="app-label">Currency</label>
          <input v-model="form.currency" class="app-inp" placeholder="USD" maxlength="10" />
        </div>
        <div>
          <label class="app-label">Contract Value</label>
          <input v-model="form.contract_value" type="number" min="0" step="0.01" class="app-inp" placeholder="0.00" />
        </div>
      </div>

      <!-- Dates -->
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

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button type="button" @click="router.push({ name: 'projects.view', params: { id: projectId } })" class="px-4 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSaving"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon v-if="isSaving" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ isSaving ? 'Saving…' : 'Save Changes' }}
        </button>
      </div>
    </form>

  </div>
</template>
