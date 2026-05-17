<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import Pagination from '@/components/ui/Pagination.vue';
import { useAuthStore } from '@/stores/auth';
import { ClientService } from '@/services/client.service';
import { useNotification } from '@/composables/notification';
import type { IClient } from '@/types/client.types';

const router    = useRouter();
const authStore = useAuthStore();
const { notify } = useNotification();

const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '');

const clients      = ref<IClient[]>([]);
const searchQuery  = ref('');
const searchInput  = ref('');
const viewMode     = ref<'grid' | 'list'>('grid');
const currentPage  = ref(1);
const lastPage     = ref(1);
const total        = ref(0);
const perPage      = ref(15);
const isLoading    = ref(true);

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const avatarColor = (id: string) => {
  const colors = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#e8a83e', '#38bdf8', '#fb923c', '#c084fc'];
  const idx = id.charCodeAt(id.length - 1) % colors.length;
  return colors[idx];
};

const clientTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    organization: 'Org',
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
    agency: 'bg-amber/10 text-amber border-amber/20',
    other: 'bg-charcoal-600 text-cream-muted border-charcoal-500',
  };
  return 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ' + (map[type] ?? map.other);
};

const primaryPhone = (client: IClient) => client.phone_numbers?.[0] ?? '—';
const addressText  = (client: IClient) => client.address?.full ?? '—';

async function fetchClients() {
  if (!orgId.value) return;
  isLoading.value = true;
  try {
    const res = await ClientService.list(orgId.value, {
      search: searchQuery.value || undefined,
      page: currentPage.value,
      per_page: perPage.value,
    });
    const paginated = res.data.data;
    clients.value  = paginated.data;
    lastPage.value = paginated.last_page;
    total.value    = paginated.total;
  } catch {
    notify('Failed to load clients.', 'error');
  } finally {
    isLoading.value = false;
  }
}

function onSearch() {
  searchQuery.value = searchInput.value;
  currentPage.value = 1;
}

watch(currentPage, fetchClients);
watch(searchQuery, fetchClients);
onMounted(fetchClients);

const goToView   = (id: string) => router.push({ name: 'clients.view',   params: { id } });
const goToCreate = ()           => router.push({ name: 'clients.create' });
const goToEdit   = (id: string) => router.push({ name: 'clients.edit',   params: { id } });
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Clients</h1>
        <p class="page-subtitle">{{ total }} client{{ total === 1 ? '' : 's' }} in your address book</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search -->
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
          <input
            v-model="searchInput"
            @keyup.enter="onSearch"
            @input="!searchInput && onSearch()"
            placeholder="Search clients…"
            class="app-inp pl-8 text-xs py-2 w-48"
          />
        </div>

        <!-- View toggle -->
        <div class="flex items-center bg-charcoal-800 border border-charcoal-700 rounded-lg p-0.5">
          <button
            @click="viewMode = 'grid'"
            :class="['p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-charcoal-600 text-cream' : 'text-cream-faint hover:text-cream']"
            title="Grid view"
          >
            <Icon icon="lucide:layout-grid" class="w-3.5 h-3.5" />
          </button>
          <button
            @click="viewMode = 'list'"
            :class="['p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-charcoal-600 text-cream' : 'text-cream-faint hover:text-cream']"
            title="List view"
          >
            <Icon icon="lucide:list" class="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          @click="goToCreate"
          class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          <Icon icon="lucide:user-plus" class="w-3.5 h-3.5" /> Add Client
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="clients.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:users" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">No clients found</p>
      <p class="text-cream-faint/60 text-xs mt-1">{{ searchQuery ? 'Try adjusting your search query' : 'Add your first client to get started' }}</p>
    </div>

    <!-- Grid view -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="client in clients" :key="client.id"
        @click="goToView(client.id)"
        class="bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer group"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-charcoal-900 shrink-0"
            :style="{ backgroundColor: avatarColor(client.id) }"
          >
            {{ initials(client.full_name) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-cream truncate">{{ client.full_name }}</div>
            <div class="text-xs text-cream-faint truncate">{{ client.company ?? '—' }}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <span :class="clientTypeBadge(client.client_type)">{{ clientTypeLabel(client.client_type) }}</span>
            <button
              @click.stop="goToEdit(client.id)"
              class="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-all"
              title="Edit client"
            >
              <Icon icon="lucide:pencil" class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Contact info -->
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-xs text-cream-faint">
            <Icon icon="lucide:mail" class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ client.email ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-cream-faint">
            <Icon icon="lucide:phone" class="w-3.5 h-3.5 shrink-0" />
            <span>{{ primaryPhone(client) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <!-- Table header -->
      <div class="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 border-b border-charcoal-700 text-[11px] font-medium text-cream-faint uppercase tracking-wide">
        <span>Client</span>
        <span>Contact</span>
        <span>Type</span>
        <span></span>
      </div>

      <!-- Table rows -->
      <div
        v-for="(client, i) in clients" :key="client.id"
        @click="goToView(client.id)"
        :class="['grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3.5 items-center hover:bg-charcoal-700/40 transition-colors cursor-pointer group', i !== clients.length - 1 ? 'border-b border-charcoal-700/60' : '']"
      >
        <!-- Client name + company -->
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0"
            :style="{ backgroundColor: avatarColor(client.id) }"
          >
            {{ initials(client.full_name) }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-cream truncate">{{ client.full_name }}</div>
            <div class="text-xs text-cream-faint truncate">{{ client.company ?? '—' }}</div>
          </div>
        </div>

        <!-- Contact -->
        <div class="min-w-0 space-y-0.5">
          <div class="flex items-center gap-1.5 text-xs text-cream-faint">
            <Icon icon="lucide:mail" class="w-3 h-3 shrink-0" />
            <span class="truncate">{{ client.email ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-cream-faint">
            <Icon icon="lucide:phone" class="w-3 h-3 shrink-0" />
            <span>{{ primaryPhone(client) }}</span>
          </div>
        </div>

        <!-- Type -->
        <div>
          <span :class="clientTypeBadge(client.client_type)">{{ clientTypeLabel(client.client_type) }}</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            @click.stop="goToEdit(client.id)"
            class="p-1.5 rounded-md hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors"
            title="Edit client"
          >
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <Pagination
      v-if="!isLoading && total > 0"
      v-model="currentPage"
      :total="total"
      :per-page="perPage"
    />

  </div>
</template>
