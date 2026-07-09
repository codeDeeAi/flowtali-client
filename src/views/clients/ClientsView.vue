<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';
import Pagination from '@/components/ui/Pagination.vue';
import { useAuthStore } from '@/stores/auth';
import { ClientService } from '@/services/client.service';
import { useNotification } from '@/composables/notification';
import type { IClient } from '@/types/client.types';

const router    = useRouter();
const { t }     = useI18n();
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
  const colors = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80', '#00c853', '#38bdf8', '#fb923c', '#c084fc'];
  const idx = id.charCodeAt(id.length - 1) % colors.length;
  return colors[idx];
};

const clientTypeLabel = (type: string) =>
  type === 'organization' ? t('clients.orgShort') : t(`clients.types.${type}`);

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
    notify(t('clients.toasts.loadFailed'), 'error');
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
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">{{ t('clients.title') }}</h1>
          <p class="page-subtitle">{{ t('clients.count', total) }}</p>
        </div>
        <button
          @click="goToCreate"
          class="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-2 rounded-lg transition-colors"
        >
          <Icon icon="lucide:user-plus" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('clients.add') }}</span>
          <span class="sm:hidden">{{ t('clients.addShort') }}</span>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search -->
        <div class="relative flex-1">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700" />
          <input
            v-model="searchInput"
            type="search"
            @keyup.enter="onSearch"
            @input="!searchInput && onSearch()"
            :placeholder="t('clients.search')"
            class="app-inp pl-8 text-xs py-2 w-full"
          />
        </div>
        <!-- View toggle -->
        <div class="flex items-center bg-gray-200 border border-gray-400 rounded-lg p-0.5 shrink-0">
          <button
            @click="viewMode = 'grid'"
            :class="['p-2 rounded-md transition-colors', viewMode === 'grid' ? 'bg-gray-500 text-gray-1000' : 'text-gray-700 hover:text-gray-1000']"
            :title="t('clients.gridView')"
          >
            <Icon icon="lucide:layout-grid" class="w-4 h-4" />
          </button>
          <button
            @click="viewMode = 'list'"
            :class="['p-2 rounded-md transition-colors', viewMode === 'list' ? 'bg-gray-500 text-gray-1000' : 'text-gray-700 hover:text-gray-1000']"
            :title="t('clients.listView')"
          >
            <Icon icon="lucide:list" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="clients.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center mb-4">
        <Icon icon="lucide:users" class="w-6 h-6 text-gray-700" />
      </div>
      <p class="text-gray-700 text-sm">{{ t('clients.empty.title') }}</p>
      <p class="text-gray-700/60 text-xs mt-1">{{ searchQuery ? t('clients.empty.searchHint') : t('clients.empty.addHint') }}</p>
    </div>

    <!-- Grid view -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="client in clients" :key="client.id"
        @click="goToView(client.id)"
        class="bg-gray-200 border border-gray-400 hover:border-gray-500 rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer group"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-bg-100 shrink-0"
            :style="{ backgroundColor: avatarColor(client.id) }"
          >
            {{ initials(client.full_name) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-1000 truncate">{{ client.full_name }}</div>
            <div class="text-xs text-gray-700 truncate">{{ client.company ?? '—' }}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <span :class="clientTypeBadge(client.client_type)">{{ clientTypeLabel(client.client_type) }}</span>
            <button
              @click.stop="goToEdit(client.id)"
              class="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-500 text-gray-700 hover:text-gray-1000 transition-all"
              :title="t('clients.editClient')"
            >
              <Icon icon="lucide:pencil" class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Contact info -->
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-xs text-gray-700">
            <Icon icon="lucide:mail" class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ client.email ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-700">
            <Icon icon="lucide:phone" class="w-3.5 h-3.5 shrink-0" />
            <span>{{ primaryPhone(client) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-else class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
      <!-- Table header -->
      <div class="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 border-b border-gray-400 text-[11px] font-medium text-gray-700 uppercase tracking-wide">
        <span>{{ t('clients.table.client') }}</span>
        <span>{{ t('clients.table.contact') }}</span>
        <span>{{ t('clients.table.type') }}</span>
        <span></span>
      </div>

      <!-- Table rows -->
      <div
        v-for="(client, i) in clients" :key="client.id"
        @click="goToView(client.id)"
        :class="['grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3.5 items-center hover:bg-gray-400/40 transition-colors cursor-pointer group', i !== clients.length - 1 ? 'border-b border-gray-400/60' : '']"
      >
        <!-- Client name + company -->
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 shrink-0"
            :style="{ backgroundColor: avatarColor(client.id) }"
          >
            {{ initials(client.full_name) }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-1000 truncate">{{ client.full_name }}</div>
            <div class="text-xs text-gray-700 truncate">{{ client.company ?? '—' }}</div>
          </div>
        </div>

        <!-- Contact -->
        <div class="min-w-0 space-y-0.5">
          <div class="flex items-center gap-1.5 text-xs text-gray-700">
            <Icon icon="lucide:mail" class="w-3 h-3 shrink-0" />
            <span class="truncate">{{ client.email ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-gray-700">
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
            class="p-1.5 rounded-md hover:bg-gray-500 text-gray-700 hover:text-gray-1000 transition-colors"
            :title="t('clients.editClient')"
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
