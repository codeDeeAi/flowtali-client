<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import Pagination from '@/components/ui/Pagination.vue';
import { useAuthStore } from '@/stores/auth';
import { ProjectService } from '@/services/project.service';
import { useNotification } from '@/composables/notification';
import type { IProject, IProjectStats } from '@/services/project.service';

const router    = useRouter();
const authStore = useAuthStore();
const { notify } = useNotification();

const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '');

const projects     = ref<IProject[]>([]);
const stats        = ref<IProjectStats | null>(null);
const searchInput  = ref('');
const searchQuery  = ref('');
const statusFilter = ref('');
const currentPage  = ref(1);
const lastPage     = ref(1);
const total        = ref(0);
const perPage      = ref(15);
const isLoading    = ref(true);

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft:     'bg-charcoal-600 text-cream-muted border-charcoal-500',
    active:    'bg-green-500/10 text-green-400 border-green-500/20',
    on_hold:   'bg-amber/10 text-amber border-amber/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ' + (map[status] ?? map.draft);
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: 'Draft', active: 'Active', on_hold: 'On Hold',
    completed: 'Completed', cancelled: 'Cancelled',
  };
  return map[status] ?? status;
};

async function fetchProjects() {
  if (!orgId.value) return;
  isLoading.value = true;
  try {
    const [projRes, statsRes] = await Promise.all([
      ProjectService.list(orgId.value, {
        search: searchQuery.value || undefined,
        status: statusFilter.value || undefined,
        page: currentPage.value,
        per_page: perPage.value,
      }),
      ProjectService.stats(orgId.value),
    ]);
    const paginated = projRes.data.data;
    projects.value  = paginated.data;
    lastPage.value  = paginated.last_page;
    total.value     = paginated.total;
    stats.value     = statsRes.data.data;
  } catch {
    notify('Failed to load projects.', 'error');
  } finally {
    isLoading.value = false;
  }
}

function onSearch() {
  searchQuery.value = searchInput.value;
  currentPage.value = 1;
}

watch([searchQuery, statusFilter], () => { currentPage.value = 1; fetchProjects(); });
watch(currentPage, fetchProjects);
onMounted(fetchProjects);

const goToCreate = ()           => router.push({ name: 'projects.create' });
const goToView   = (id: string) => router.push({ name: 'projects.view', params: { id } });
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Projects</h1>
        <p class="page-subtitle">{{ total }} project{{ total === 1 ? '' : 's' }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <!-- Search -->
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
          <input
            v-model="searchInput"
            @keyup.enter="onSearch"
            @input="!searchInput && onSearch()"
            placeholder="Search projects…"
            class="w-52 bg-[#1c1c21] border border-[#2e2e37] rounded-lg text-cream text-xs px-3 pl-8 py-2 outline-none placeholder-[#6b6560] focus:border-amber/40 focus:ring-2 focus:ring-amber/10 transition-colors font-['DM_Sans']"
          />
        </div>

        <!-- Status filter -->
        <select v-model="statusFilter" class="app-inp text-xs py-2 w-28">
          <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <button
          @click="goToCreate"
          class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> New Project
        </button>
      </div>
    </div>

    <!-- Stats bar -->
    <div v-if="stats" class="grid grid-cols-3 md:grid-cols-5 gap-3 w-full">
      <div
        v-for="opt in STATUS_OPTIONS.filter(o => o.value)"
        :key="opt.value"
        @click="statusFilter = statusFilter === opt.value ? '' : opt.value"
        :class="[
          'bg-charcoal-800 border rounded-xl p-3 text-center cursor-pointer transition-colors',
          statusFilter === opt.value ? 'border-amber/40' : 'border-charcoal-700 hover:border-charcoal-600',
        ]"
      >
        <div class="text-xl font-bold text-cream">{{ (stats as any)[opt.value] ?? 0 }}</div>
        <div class="text-[10px] text-cream-faint mt-0.5">{{ opt.label }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="projects.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:folder-kanban" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">No projects found</p>
      <p class="text-cream-faint/60 text-xs mt-1">{{ searchQuery || statusFilter ? 'Try adjusting your filters' : 'Create your first project to get started' }}</p>
      <button v-if="!searchQuery && !statusFilter" @click="goToCreate" class="mt-4 text-xs text-amber hover:underline">
        Create a project
      </button>
    </div>

    <!-- Project grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="project in projects" :key="project.id"
        @click="goToView(project.id)"
        class="bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer"
      >
        <!-- Header row -->
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-cream-faint mb-0.5">{{ project.number }}</div>
            <div class="text-sm font-semibold text-cream truncate">{{ project.title }}</div>
          </div>
          <span :class="statusBadge(project.status)">{{ statusLabel(project.status) }}</span>
        </div>

        <!-- Client -->
        <div v-if="project.client" class="flex items-center gap-1.5 text-xs text-cream-faint mb-3">
          <Icon icon="lucide:building-2" class="w-3 h-3 shrink-0" />
          <span class="truncate">{{ project.client.name }}</span>
        </div>

        <!-- Counts -->
        <div class="flex items-center gap-3 text-[11px] text-cream-faint">
          <span class="flex items-center gap-1">
            <Icon icon="lucide:file-text" class="w-3 h-3" /> {{ project.invoice_count }}
          </span>
          <span class="flex items-center gap-1">
            <Icon icon="lucide:receipt" class="w-3 h-3" /> {{ project.receipt_count }}
          </span>
          <span class="flex items-center gap-1">
            <Icon icon="lucide:file" class="w-3 h-3" /> {{ project.letterhead_count }}
          </span>
        </div>

        <!-- Contract value -->
        <div v-if="project.contract_value" class="mt-3 pt-3 border-t border-charcoal-700 text-xs text-cream-faint">
          Contract: <span class="text-cream font-medium">{{ project.currency }} {{ project.contract_value.toLocaleString() }}</span>
        </div>

        <!-- Dates -->
        <div v-if="project.start_date || project.end_date" class="mt-2 flex items-center gap-1.5 text-[11px] text-cream-faint">
          <Icon icon="lucide:calendar" class="w-3 h-3" />
          <span>{{ project.start_date ?? '—' }} → {{ project.end_date ?? '—' }}</span>
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
