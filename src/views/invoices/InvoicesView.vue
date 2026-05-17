<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useNotification } from '@/composables/notification.ts';
import Pagination from '@/components/ui/Pagination.vue';

const router  = useRouter();
const { notify } = useNotification();

type Status = 'All' | 'Paid' | 'Due' | 'Overdue' | 'Draft';

interface Invoice {
  id: number; number: string; client: string; email: string;
  amount: string; amountRaw: number; status: 'Paid' | 'Due' | 'Overdue' | 'Draft';
  issueDate: string; dueDate: string; color: string;
}

const filterTab   = ref<Status>('All');
const searchQuery = ref('');
const currentPage = ref(1);
const perPage     = 5;
const filters: Status[] = ['All', 'Paid', 'Due', 'Overdue', 'Draft'];
const selectedIds = ref<Set<number>>(new Set());

const showDeleteConfirm = ref(false);
const deleteTarget      = ref<Invoice | null>(null);

const statusClass: Record<string, string> = {
  Paid: 'status-paid', Due: 'status-due', Overdue: 'status-overdue', Draft: 'status-draft',
};

const invoices = ref<Invoice[]>([
  { id: 1, number: 'INV-0042', client: 'Globex Corp',   email: 'billing@globex.com',  amount: '$8,550',  amountRaw: 8550,  status: 'Paid',    issueDate: 'Mar 15', dueDate: 'Apr 14', color: '#60a5fa' },
  { id: 2, number: 'INV-0041', client: 'Pixel Works',   email: 'accounts@pxl.io',     amount: '$3,200',  amountRaw: 3200,  status: 'Due',     issueDate: 'Mar 10', dueDate: 'Apr 10', color: '#a78bfa' },
  { id: 3, number: 'INV-0040', client: 'Nova Agency',   email: 'finance@nova.co',     amount: '$5,800',  amountRaw: 5800,  status: 'Overdue', issueDate: 'Feb 28', dueDate: 'Mar 28', color: '#f87171' },
  { id: 4, number: 'INV-0039', client: 'Bright Minds',  email: 'pay@brightminds.io',  amount: '$1,200',  amountRaw: 1200,  status: 'Paid',    issueDate: 'Feb 20', dueDate: 'Mar 20', color: '#4ade80' },
  { id: 5, number: 'INV-0038', client: 'Studio X',      email: 'hello@studiox.co',    amount: '$7,000',  amountRaw: 7000,  status: 'Draft',   issueDate: 'Mar 18', dueDate: 'Apr 17', color: '#e8a83e' },
  { id: 6, number: 'INV-0037', client: 'Frontier Tech', email: 'ar@frontier.tech',    amount: '$4,400',  amountRaw: 4400,  status: 'Paid',    issueDate: 'Feb 12', dueDate: 'Mar 12', color: '#38bdf8' },
  { id: 7, number: 'INV-0036', client: 'Globex Corp',   email: 'billing@globex.com',  amount: '$6,100',  amountRaw: 6100,  status: 'Paid',    issueDate: 'Jan 30', dueDate: 'Mar 01', color: '#60a5fa' },
  { id: 8, number: 'INV-0035', client: 'Pixel Works',   email: 'accounts@pxl.io',     amount: '$2,900',  amountRaw: 2900,  status: 'Overdue', issueDate: 'Jan 20', dueDate: 'Feb 19', color: '#a78bfa' },
  { id: 9, number: 'INV-0034', client: 'Nova Agency',   email: 'finance@nova.co',     amount: '$3,600',  amountRaw: 3600,  status: 'Paid',    issueDate: 'Jan 10', dueDate: 'Feb 09', color: '#f87171' },
  { id:10, number: 'INV-0033', client: 'Studio X',      email: 'hello@studiox.co',    amount: '$5,250',  amountRaw: 5250,  status: 'Due',     issueDate: 'Jan 05', dueDate: 'Feb 04', color: '#e8a83e' },
]);

const filtered = computed(() => {
  let list = filterTab.value === 'All' ? invoices.value : invoices.value.filter(i => i.status === filterTab.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(i => i.client.toLowerCase().includes(q) || i.number.toLowerCase().includes(q) || i.email.toLowerCase().includes(q));
  }
  return list;
});

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filtered.value.slice(start, start + perPage);
});

const onFilter = () => { currentPage.value = 1; selectedIds.value.clear(); };

// Stats
const stats = computed(() => ({
  total:    invoices.value.reduce((s, i) => s + i.amountRaw, 0),
  paid:     invoices.value.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amountRaw, 0),
  due:      invoices.value.filter(i => i.status === 'Due' || i.status === 'Overdue').reduce((s, i) => s + i.amountRaw, 0),
  draft:    invoices.value.filter(i => i.status === 'Draft').length,
}));

const fmt = (n: number) => `$${n.toLocaleString()}`;

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Selection
const allSelected = computed(() =>
  paginated.value.length > 0 && paginated.value.every(i => selectedIds.value.has(i.id))
);
const toggleAll = () => {
  if (allSelected.value) paginated.value.forEach(i => selectedIds.value.delete(i.id));
  else paginated.value.forEach(i => selectedIds.value.add(i.id));
};
const toggleOne = (id: number) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
};

// Actions
const markPaid = (inv: Invoice) => {
  inv.status = 'Paid';
  notify(`${inv.number} marked as paid`, 'success');
};
const openDelete = (inv: Invoice) => {
  deleteTarget.value = inv;
  showDeleteConfirm.value = true;
};
const handleDelete = () => {
  if (!deleteTarget.value) return;
  invoices.value = invoices.value.filter(i => i.id !== deleteTarget.value!.id);
  notify(`${deleteTarget.value.number} deleted`, 'success');
  showDeleteConfirm.value = false;
};
const deleteSelected = () => {
  const count = selectedIds.value.size;
  invoices.value = invoices.value.filter(i => !selectedIds.value.has(i.id));
  selectedIds.value.clear();
  notify(`${count} invoice${count > 1 ? 's' : ''} deleted`, 'success');
};
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Invoices</h1>
        <p class="page-subtitle">Manage and track all your invoices</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 text-cream-muted hover:text-cream text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:download" class="w-3.5 h-3.5" /> Export CSV
        </button>
        <button @click="router.push({ name: 'invoices.create' })" class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> New Invoice
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Total Invoiced</div>
        <div class="text-xl font-bold text-cream font-mono">{{ fmt(stats.total) }}</div>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Total Paid</div>
        <div class="text-xl font-bold text-green-400 font-mono">{{ fmt(stats.paid) }}</div>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Outstanding</div>
        <div class="text-xl font-bold text-amber font-mono">{{ fmt(stats.due) }}</div>
      </div>
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
        <div class="text-xs text-cream-faint mb-1">Draft</div>
        <div class="text-xl font-bold text-cream-muted">{{ stats.draft }}</div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex items-center gap-1 bg-charcoal-800 border border-charcoal-700 rounded-lg p-1 w-fit">
      <button
        v-for="f in filters" :key="f"
        :class="['text-xs font-medium px-3 py-1.5 rounded-md transition-colors', filterTab === f ? 'bg-amber/10 text-amber' : 'text-cream-faint hover:text-cream-muted']"
        @click="filterTab = f; onFilter()"
      >{{ f }}</button>
    </div>

    <!-- Table card -->
    <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <!-- Search + bulk actions -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-charcoal-700 gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="relative">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
            <input v-model="searchQuery" @input="onFilter" placeholder="Search invoices…" class="app-inp pl-8 w-48 text-xs py-2" />
          </div>
          <Transition name="fade">
            <button
              v-if="selectedIds.size > 0"
              @click="deleteSelected"
              class="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              Delete {{ selectedIds.size }} selected
            </button>
          </Transition>
        </div>
        <span class="text-xs text-cream-faint shrink-0">{{ filtered.length }} invoice{{ filtered.length !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Desktop table -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="app-table">
          <thead>
            <tr>
              <th class="w-8"><input type="checkbox" class="accent-amber" :checked="allSelected" @change="toggleAll" /></th>
              <th>Invoice</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in paginated" :key="inv.id"
              :class="['cursor-pointer', selectedIds.has(inv.id) ? 'bg-amber/5' : '']"
              @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
            >
              <td @click.stop><input type="checkbox" class="accent-amber" :checked="selectedIds.has(inv.id)" @change="toggleOne(inv.id)" /></td>
              <td class="font-mono text-xs text-cream-muted">{{ inv.number }}</td>
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: inv.color }">
                    {{ initials(inv.client) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-cream leading-tight">{{ inv.client }}</div>
                    <div class="text-xs text-cream-faint">{{ inv.email }}</div>
                  </div>
                </div>
              </td>
              <td class="font-mono font-semibold text-cream">{{ inv.amount }}</td>
              <td><span :class="['status-badge', statusClass[inv.status]]">{{ inv.status }}</span></td>
              <td class="text-cream-faint text-xs">{{ inv.issueDate }}</td>
              <td class="text-cream-faint text-xs">{{ inv.dueDate }}</td>
              <td @click.stop>
                <div class="flex items-center gap-0.5">
                  <button
                    @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors"
                    title="View"
                  ><Icon icon="lucide:eye" class="w-3.5 h-3.5" /></button>
                  <button
                    @click="router.push({ name: 'invoices.edit', params: { id: inv.id } })"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors"
                    title="Edit"
                  ><Icon icon="lucide:pencil" class="w-3.5 h-3.5" /></button>
                  <button
                    v-if="inv.status !== 'Paid'"
                    @click="markPaid(inv)"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-green-400 hover:bg-charcoal-700 transition-colors"
                    title="Mark as paid"
                  ><Icon icon="lucide:check-circle" class="w-3.5 h-3.5" /></button>
                  <button
                    @click="openDelete(inv)"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-red-400 hover:bg-charcoal-700 transition-colors"
                    title="Delete"
                  ><Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="paginated.length === 0">
              <td colspan="8" class="text-center py-12 text-cream-faint text-sm">No invoices match your filters</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile list -->
      <div class="sm:hidden divide-y divide-charcoal-700">
        <div
          v-for="inv in paginated" :key="inv.id"
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-charcoal-700/30 transition-colors"
          @click="router.push({ name: 'invoices.view', params: { id: inv.id } })"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0" :style="{ backgroundColor: inv.color }">
              {{ initials(inv.client) }}
            </div>
            <div>
              <div class="text-sm font-medium text-cream">{{ inv.client }}</div>
              <div class="text-xs text-cream-faint">{{ inv.number }} · {{ inv.issueDate }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span class="text-sm font-semibold font-mono text-cream">{{ inv.amount }}</span>
            <span :class="['status-badge', statusClass[inv.status]]">{{ inv.status }}</span>
          </div>
        </div>
        <div v-if="paginated.length === 0" class="text-center py-12 text-cream-faint text-sm">No invoices match your filters</div>
      </div>

      <!-- Pagination row -->
      <div class="px-4 py-3 border-t border-charcoal-700">
        <Pagination v-model="currentPage" :total="filtered.length" :per-page="perPage" />
      </div>
    </div>

  </div>

  <!-- Delete confirm -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteConfirm && deleteTarget" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-cream">Delete {{ deleteTarget.number }}?</h3>
              <p class="text-xs text-cream-faint mt-1 leading-relaxed">This invoice will be permanently deleted. This action cannot be undone.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
            <button @click="handleDelete" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
