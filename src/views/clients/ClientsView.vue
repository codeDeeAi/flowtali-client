<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import Pagination from '@/components/ui/Pagination.vue';

interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
  type: 'B2B' | 'B2C';
  invoices: number;
  totalBilled: string;
  lastInvoice: string;
}

const router = useRouter();
const searchQuery = ref('');
const viewMode    = ref<'grid' | 'list'>('grid');
const currentPage = ref(1);
const perPage     = 3;

const clients: Client[] = [
  { id: 1, name: 'James Johnson',   company: 'Globex Corporation', email: 'james@globex.com',    phone: '+1 212 555 0100',  initials: 'JJ', color: '#60a5fa', type: 'B2B', invoices: 8, totalBilled: '$42,200', lastInvoice: 'Mar 15' },
  { id: 2, name: 'Sofia Martinez',  company: 'Pixel Works Ltd',    email: 'sofia@pixelworks.io', phone: '+44 20 7946 0958', initials: 'SM', color: '#a78bfa', type: 'B2B', invoices: 5, totalBilled: '$18,400', lastInvoice: 'Mar 10' },
  { id: 3, name: 'Kofi Acheampong', company: 'Nova Agency',        email: 'kofi@nova.co',        phone: '+233 30 295 0100', initials: 'KA', color: '#f87171', type: 'B2B', invoices: 3, totalBilled: '$9,800',  lastInvoice: 'Feb 28' },
  { id: 4, name: 'Priya Nair',      company: 'Freelance',          email: 'priya@mail.com',      phone: '+91 98765 43210',  initials: 'PN', color: '#4ade80', type: 'B2C', invoices: 2, totalBilled: '$4,400',  lastInvoice: 'Feb 20' },
  { id: 5, name: 'Marcus Bell',     company: 'Studio X',           email: 'marcus@studiox.co',   phone: '+1 415 555 0199',  initials: 'MB', color: '#e8a83e', type: 'B2B', invoices: 4, totalBilled: '$21,000', lastInvoice: 'Mar 18' },
  { id: 6, name: 'Chen Wei',        company: 'Frontier Tech',      email: 'chen@frontier.tech',  phone: '+86 10 6552 9988', initials: 'CW', color: '#38bdf8', type: 'B2B', invoices: 6, totalBilled: '$28,600', lastInvoice: 'Feb 12' },
];

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return q
    ? clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    : clients;
});

// Reset to page 1 whenever search changes
const onSearch = () => { currentPage.value = 1; };

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filtered.value.slice(start, start + perPage);
});

const goToView   = (id: number) => router.push({ name: 'clients.view',   params: { id } });
const goToCreate = ()           => router.push({ name: 'clients.create' });
const goToEdit   = (id: number) => router.push({ name: 'clients.edit',   params: { id } });
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Clients</h1>
        <p class="page-subtitle">{{ clients.length }} clients in your address book</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search -->
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
          <input v-model="searchQuery" @input="onSearch" placeholder="Search clients…" class="app-inp pl-8 text-xs py-2 w-48" />
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

    <!-- Empty state -->
    <div v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:users" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">No clients found</p>
      <p class="text-cream-faint/60 text-xs mt-1">Try adjusting your search query</p>
    </div>

    <!-- Grid view -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="client in paginated" :key="client.id"
        @click="goToView(client.id)"
        class="bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer group"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: client.color }">
            {{ client.initials }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-cream truncate">{{ client.name }}</div>
            <div class="text-xs text-cream-faint truncate">{{ client.company }}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <span :class="['status-badge', client.type === 'B2B' ? 'tag-b2b' : 'tag-b2c']">{{ client.type }}</span>
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
        <div class="space-y-1.5 mb-4">
          <div class="flex items-center gap-2 text-xs text-cream-faint">
            <Icon icon="lucide:mail" class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ client.email }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-cream-faint">
            <Icon icon="lucide:phone" class="w-3.5 h-3.5 shrink-0" />
            <span>{{ client.phone }}</span>
          </div>
        </div>

        <div class="h-px bg-charcoal-700 mb-4"></div>

        <!-- Stats row -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="font-mono text-base font-bold text-cream">{{ client.invoices }}</div>
            <div class="text-[10px] text-cream-faint">Invoices</div>
          </div>
          <div>
            <div class="font-mono text-base font-bold text-green-400">{{ client.totalBilled }}</div>
            <div class="text-[10px] text-cream-faint">Total Billed</div>
          </div>
          <div>
            <div class="text-xs text-cream-faint mb-0.5">Last invoice</div>
            <div class="text-xs text-cream-muted">{{ client.lastInvoice }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <!-- Table header -->
      <div class="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-charcoal-700 text-[11px] font-medium text-cream-faint uppercase tracking-wide">
        <span>Client</span>
        <span>Contact</span>
        <span>Type</span>
        <span>Invoices</span>
        <span>Total Billed</span>
        <span></span>
      </div>

      <!-- Table rows -->
      <div
        v-for="(client, i) in paginated" :key="client.id"
        @click="goToView(client.id)"
        :class="['grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 items-center hover:bg-charcoal-700/40 transition-colors cursor-pointer group', i !== paginated.length - 1 ? 'border-b border-charcoal-700/60' : '']"
      >
        <!-- Client name + company -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: client.color }">
            {{ client.initials }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-cream truncate">{{ client.name }}</div>
            <div class="text-xs text-cream-faint truncate">{{ client.company }}</div>
          </div>
        </div>

        <!-- Contact -->
        <div class="min-w-0 space-y-0.5">
          <div class="flex items-center gap-1.5 text-xs text-cream-faint">
            <Icon icon="lucide:mail" class="w-3 h-3 shrink-0" />
            <span class="truncate">{{ client.email }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-cream-faint">
            <Icon icon="lucide:phone" class="w-3 h-3 shrink-0" />
            <span>{{ client.phone }}</span>
          </div>
        </div>

        <!-- Type -->
        <div>
          <span :class="['status-badge', client.type === 'B2B' ? 'tag-b2b' : 'tag-b2c']">{{ client.type }}</span>
        </div>

        <!-- Invoices -->
        <div class="font-mono text-sm font-semibold text-cream">{{ client.invoices }}</div>

        <!-- Total billed -->
        <div class="font-mono text-sm font-semibold text-green-400">{{ client.totalBilled }}</div>

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
      v-if="filtered.length > 0"
      v-model="currentPage"
      :total="filtered.length"
      :per-page="perPage"
    />

  </div>
</template>
