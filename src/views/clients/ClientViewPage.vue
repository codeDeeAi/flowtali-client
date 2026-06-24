<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useNotification } from '@/composables/notification.ts';
import { useAuthStore } from '@/stores/auth';
import { ClientService } from '@/services/client.service';
import type { IClient } from '@/types/client.types';

const router    = useRouter();
const route     = useRoute();
const authStore = useAuthStore();
const { notify } = useNotification();

const orgId    = computed(() => authStore.getCurrentOrganization?.id ?? '');
const clientId = route.params.id as string;

const client   = ref<IClient | null>(null);
const loading  = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

onMounted(async () => {
  try {
    const res = await ClientService.get(orgId.value, clientId);
    client.value = res.data.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      notFound.value = true;
    } else {
      notify('Failed to load client.', 'error');
      router.push({ name: 'clients' });
    }
  } finally {
    loading.value = false;
  }
});

const initials = (name: string) =>
  name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

const avatarColor = (id: string) => {
  const colors = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#00c853', '#38bdf8', '#fb923c', '#c084fc'];
  return colors[id.charCodeAt(id.length - 1) % colors.length];
};

const clientTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    organization: 'Organization',
    individual: 'Individual',
    freelancer: 'Freelancer',
    agency: 'Agency',
    other: 'Other',
  };
  return map[type] ?? type;
};

const clientTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    organization: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    individual: 'bg-green-500/10 text-green-400 border-green-500/20',
    freelancer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    agency: 'bg-green-700/10 text-green-700 border-green-700/20',
    other: 'bg-gray-500 text-gray-900 border-gray-500',
  };
  return 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ' + (map[type] ?? map.other);
};

const primaryPhone = computed(() => client.value?.phone_numbers?.[0] ?? null);
const addressText  = computed(() => client.value?.address?.full ?? null);
const clientSince  = computed(() => {
  if (!client.value?.created_at) return null;
  return new Date(client.value.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
});

const handleDelete = async () => {
  isDeleting.value = true;
  try {
    await ClientService.delete(orgId.value, clientId);
    notify('Client deleted successfully.', 'success');
    router.push({ name: 'clients' });
  } catch {
    notify('Failed to delete client.', 'error');
    showDeleteConfirm.value = false;
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 min-h-full">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center mb-4">
        <Icon icon="lucide:user-x" class="w-6 h-6 text-gray-700" />
      </div>
      <p class="text-gray-700 text-sm">Client not found</p>
      <button @click="router.push({ name: 'clients' })" class="mt-4 text-green-700 text-sm hover:underline">
        Back to clients
      </button>
    </div>

    <template v-else-if="client">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            @click="router.push({ name: 'clients' })"
            class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors shrink-0"
          >
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="page-title">{{ client.full_name }}</h1>
              <span :class="clientTypeBadge(client.client_type)">{{ clientTypeLabel(client.client_type) }}</span>
            </div>
            <p class="page-subtitle">
              {{ client.company ?? 'No company' }}
              <template v-if="clientSince"> · Client since {{ clientSince }}</template>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-9 sm:ml-0">
          <button
            @click="router.push({ name: 'clients.edit', params: { id: client.id } })"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 hover:border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors"
          >
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> Edit
          </button>
          <button
            @click="showDeleteConfirm = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-colors"
          >
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      <!-- Client info card -->
      <div class="max-w-xl bg-gray-200 border border-gray-400 rounded-xl p-5 space-y-5">
        <!-- Avatar + name -->
        <div class="flex items-center gap-3">
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-bg-100 shrink-0"
            :style="{ backgroundColor: avatarColor(client.id) }"
          >{{ initials(client.full_name) }}</div>
          <div>
            <div class="text-base font-semibold text-gray-1000">{{ client.full_name }}</div>
            <div class="text-sm text-gray-700">{{ client.company ?? 'No company' }}</div>
          </div>
        </div>

        <div class="h-px bg-gray-400"></div>

        <!-- Contact details -->
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon="lucide:mail" class="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div>
              <div class="text-[10px] text-gray-700 uppercase tracking-wide mb-0.5">Email</div>
              <div class="text-xs text-gray-1000">{{ client.email ?? '—' }}</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon="lucide:phone" class="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div>
              <div class="text-[10px] text-gray-700 uppercase tracking-wide mb-0.5">Phone</div>
              <div class="text-xs text-gray-1000">{{ primaryPhone ?? '—' }}</div>
              <div v-if="client.phone_numbers && client.phone_numbers.length > 1" class="space-y-0.5 mt-1">
                <div v-for="(phone, i) in client.phone_numbers.slice(1)" :key="i" class="text-xs text-gray-700">{{ phone }}</div>
              </div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon="lucide:map-pin" class="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div>
              <div class="text-[10px] text-gray-700 uppercase tracking-wide mb-0.5">Address</div>
              <div class="text-xs text-gray-1000 leading-relaxed">{{ addressText ?? '—' }}</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon="lucide:tag" class="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div>
              <div class="text-[10px] text-gray-700 uppercase tracking-wide mb-0.5">Type</div>
              <span :class="clientTypeBadge(client.client_type)">{{ clientTypeLabel(client.client_type) }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <template v-if="client.notes">
          <div class="h-px bg-gray-400"></div>
          <div>
            <div class="text-[10px] text-gray-700 uppercase tracking-wide mb-2">Notes</div>
            <p class="text-xs text-gray-900 leading-relaxed">{{ client.notes }}</p>
          </div>
        </template>
      </div>

    </template>

    <!-- Delete confirm overlay -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-1000">Delete client?</h3>
              <p class="text-xs text-gray-700 mt-1 leading-relaxed">
                This will permanently delete <span class="text-gray-1000 font-medium">{{ client?.full_name }}</span> and all associated records. This action cannot be undone.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="showDeleteConfirm = false"
              :disabled="isDeleting"
              class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              :disabled="isDeleting"
              class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
              {{ isDeleting ? 'Deleting…' : 'Delete client' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
