<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useNotification } from '@/composables/notification.ts';

const router = useRouter();
const route  = useRoute();
const { notify } = useNotification();

// ─── Mock data ─────────────────────────────────────────────────────────────
interface Client {
  id: number; name: string; company: string; email: string; phone: string;
  initials: string; color: string; type: 'B2B' | 'B2C'; address: string; notes: string;
  since: string;
}

interface Invoice {
  id: string; amount: number; status: 'PAID' | 'DUE' | 'OVERDUE' | 'DRAFT'; date: string; description: string;
}

const mockClients: Client[] = [
  { id: 1, name: 'James Johnson',   company: 'Globex Corporation', email: 'james@globex.com',    phone: '+1 212 555 0100',  initials: 'JJ', color: '#60a5fa', type: 'B2B', address: '123 Broadway, New York, NY 10006', notes: 'Key enterprise account. Prefers detailed breakdowns on all invoices.',   since: 'Jan 2023' },
  { id: 2, name: 'Sofia Martinez',  company: 'Pixel Works Ltd',    email: 'sofia@pixelworks.io', phone: '+44 20 7946 0958', initials: 'SM', color: '#a78bfa', type: 'B2B', address: '10 Downing St, London SW1A 2AA',   notes: '',                                                                       since: 'Mar 2023' },
  { id: 3, name: 'Kofi Acheampong', company: 'Nova Agency',        email: 'kofi@nova.co',        phone: '+233 30 295 0100', initials: 'KA', color: '#f87171', type: 'B2B', address: 'Ring Road Central, Accra, Ghana',  notes: 'Invoices should be in USD.',                                             since: 'Jun 2023' },
  { id: 4, name: 'Priya Nair',      company: 'Freelance',          email: 'priya@mail.com',      phone: '+91 98765 43210',  initials: 'PN', color: '#4ade80', type: 'B2C', address: 'Bandra West, Mumbai 400050',       notes: 'Prefers monthly billing cycle.',                                         since: 'Aug 2023' },
  { id: 5, name: 'Marcus Bell',     company: 'Studio X',           email: 'marcus@studiox.co',   phone: '+1 415 555 0199',  initials: 'MB', color: '#e8a83e', type: 'B2B', address: '555 Mission St, San Francisco, CA', notes: '',                                                                       since: 'Oct 2022' },
  { id: 6, name: 'Chen Wei',        company: 'Frontier Tech',      email: 'chen@frontier.tech',  phone: '+86 10 6552 9988', initials: 'CW', color: '#38bdf8', type: 'B2B', address: 'Zhongguancun, Haidian, Beijing',  notes: 'Requires PO number on every invoice.',                                   since: 'Feb 2023' },
];

const mockInvoices: Record<number, Invoice[]> = {
  1: [
    { id: 'INV-0042', amount: 8550,  status: 'PAID',    date: 'Mar 15', description: 'Brand identity & strategy' },
    { id: 'INV-0038', amount: 6200,  status: 'PAID',    date: 'Feb 20', description: 'Website redesign – phase 1' },
    { id: 'INV-0031', amount: 12400, status: 'PAID',    date: 'Jan 10', description: 'Website redesign – phase 2' },
    { id: 'INV-0025', amount: 5050,  status: 'OVERDUE', date: 'Dec 05', description: 'Motion graphics package' },
  ],
  2: [
    { id: 'INV-0041', amount: 3200,  status: 'DUE',  date: 'Mar 10', description: 'UI component library' },
    { id: 'INV-0034', amount: 8100,  status: 'PAID', date: 'Feb 01', description: 'App design sprint' },
    { id: 'INV-0028', amount: 4500,  status: 'PAID', date: 'Jan 05', description: 'Design system audit' },
  ],
  3: [
    { id: 'INV-0040', amount: 5800,  status: 'OVERDUE', date: 'Feb 28', description: 'Campaign visuals' },
    { id: 'INV-0033', amount: 2400,  status: 'PAID',    date: 'Jan 15', description: 'Social media kit' },
  ],
  4: [
    { id: 'INV-0039', amount: 1200,  status: 'PAID', date: 'Feb 20', description: 'Logo design' },
    { id: 'INV-0030', amount: 2200,  status: 'PAID', date: 'Jan 12', description: 'Brand guidelines' },
  ],
  5: [
    { id: 'INV-0038', amount: 7000,  status: 'DRAFT', date: 'Mar 18', description: 'Production design' },
    { id: 'INV-0032', amount: 6500,  status: 'PAID',  date: 'Feb 10', description: 'Set design concepts' },
    { id: 'INV-0026', amount: 4200,  status: 'PAID',  date: 'Jan 08', description: 'Storyboard illustration' },
  ],
  6: [
    { id: 'INV-0037', amount: 4400,  status: 'PAID', date: 'Feb 12', description: 'Dashboard UI design' },
    { id: 'INV-0035', amount: 9800,  status: 'PAID', date: 'Jan 22', description: 'Mobile app screens' },
    { id: 'INV-0029', amount: 7200,  status: 'PAID', date: 'Dec 30', description: 'Design system v2' },
    { id: 'INV-0022', amount: 4100,  status: 'PAID', date: 'Nov 15', description: 'Icon library' },
  ],
};

// ─── State ──────────────────────────────────────────────────────────────────
const client   = ref<Client | null>(null);
const invoices = ref<Invoice[]>([]);
const loading  = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);

onMounted(async () => {
  await new Promise(r => setTimeout(r, 350));
  const id = Number(route.params.id);
  const found = mockClients.find(c => c.id === id);
  if (!found) { notFound.value = true; loading.value = false; return; }
  client.value   = found;
  invoices.value = mockInvoices[id] ?? [];
  loading.value  = false;
});

// ─── Derived stats ──────────────────────────────────────────────────────────
const totalBilled = computed(() =>
  invoices.value.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)
);
const outstanding = computed(() =>
  invoices.value.filter(i => i.status === 'DUE' || i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0)
);
const avgInvoice = computed(() =>
  invoices.value.length ? Math.round(invoices.value.reduce((s, i) => s + i.amount, 0) / invoices.value.length) : 0
);

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;

// ─── Status config ───────────────────────────────────────────────────────────
const statusConfig = {
  PAID:    { label: 'Paid',    classes: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  DUE:     { label: 'Due',     classes: 'bg-amber/10 text-amber border border-amber/20' },
  OVERDUE: { label: 'Overdue', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  DRAFT:   { label: 'Draft',   classes: 'bg-charcoal-600 text-cream-muted border border-charcoal-500' },
};

// ─── Revenue chart (SVG bar chart, monthly mock) ─────────────────────────────
type Period = '3M' | '6M' | '1Y';
const activePeriod = ref<Period>('6M');
const periods: Period[] = ['3M', '6M', '1Y'];

const chartData: Record<Period, { label: string; value: number }[]> = {
  '3M': [
    { label: 'Jan', value: 4400 }, { label: 'Feb', value: 6200 }, { label: 'Mar', value: 8550 },
  ],
  '6M': [
    { label: 'Oct', value: 2800 }, { label: 'Nov', value: 5050 }, { label: 'Dec', value: 3200 },
    { label: 'Jan', value: 4400 }, { label: 'Feb', value: 6200 }, { label: 'Mar', value: 8550 },
  ],
  '1Y': [
    { label: 'Apr', value: 1200 }, { label: 'May', value: 3400 }, { label: 'Jun', value: 2800 },
    { label: 'Jul', value: 4100 }, { label: 'Aug', value: 3600 }, { label: 'Sep', value: 5200 },
    { label: 'Oct', value: 2800 }, { label: 'Nov', value: 5050 }, { label: 'Dec', value: 3200 },
    { label: 'Jan', value: 4400 }, { label: 'Feb', value: 6200 }, { label: 'Mar', value: 8550 },
  ],
};

const chartW = 320; const chartH = 100;
const barGap = 5;   const padX = 10; const padTop = 8; const padBot = 20;

const bars = computed(() => {
  const data   = chartData[activePeriod.value];
  const maxVal = Math.max(...data.map(d => d.value));
  const avail  = chartW - padX * 2;
  const barW   = Math.floor(avail / data.length) - barGap;
  const availH = chartH - padTop - padBot;
  return data.map((d, i) => ({
    x: padX + i * (barW + barGap),
    y: padTop + availH - (d.value / maxVal) * availH,
    w: barW,
    h: (d.value / maxVal) * availH,
    label: d.label,
    labelX: padX + i * (barW + barGap) + barW / 2,
  }));
});

// ─── Invoice status donut ────────────────────────────────────────────────────
const donutSegments = computed(() => [
  { label: 'Paid',    value: invoices.value.filter(i => i.status === 'PAID').length,    color: '#4ade80' },
  { label: 'Due',     value: invoices.value.filter(i => i.status === 'DUE').length,     color: '#e8a83e' },
  { label: 'Overdue', value: invoices.value.filter(i => i.status === 'OVERDUE').length, color: '#f87171' },
  { label: 'Draft',   value: invoices.value.filter(i => i.status === 'DRAFT').length,   color: '#6b7280' },
].filter(s => s.value > 0));

const donutTotal = computed(() => donutSegments.value.reduce((s, d) => s + d.value, 0));

const R = 36; const cx = 46; const cy = 46; const sw = 10; const gap = 2;
const circ = 2 * Math.PI * R;

const donutArcs = computed(() => {
  let offset = -(circ / 4);
  return donutSegments.value.map(seg => {
    const len      = (seg.value / donutTotal.value) * circ - gap;
    const dashArr  = `${len} ${circ}`;
    const dashOff  = String(offset);
    offset        -= len + gap;
    return { ...seg, dashArr, dashOff };
  });
});

// ─── Actions ─────────────────────────────────────────────────────────────────
const handleDelete = () => {
  showDeleteConfirm.value = false;
  notify('Client deleted successfully', 'success');
  router.push({ name: 'clients' });
};
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 min-h-full">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:user-x" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">Client not found</p>
      <button @click="router.push({ name: 'clients' })" class="mt-4 text-amber text-sm hover:underline">
        Back to clients
      </button>
    </div>

    <template v-else-if="client">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            @click="router.push({ name: 'clients' })"
            class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors shrink-0"
          >
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="page-title">{{ client.name }}</h1>
              <span :class="['status-badge', client.type === 'B2B' ? 'tag-b2b' : 'tag-b2c']">{{ client.type }}</span>
            </div>
            <p class="page-subtitle">{{ client.company }} · Client since {{ client.since }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-9 sm:ml-0">
          <button
            @click="router.push({ name: 'clients.edit', params: { id: client.id } })"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 hover:border-charcoal-500 text-cream-faint hover:text-cream rounded-lg transition-colors"
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

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">

        <!-- ── Left column ──────────────────────────────── -->
        <div class="flex flex-col gap-5">

          <!-- Client info card -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-5">
            <!-- Avatar + name -->
            <div class="flex items-center gap-3">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-charcoal-900 shrink-0"
                :style="{ backgroundColor: client.color }"
              >{{ client.initials }}</div>
              <div>
                <div class="text-base font-semibold text-cream">{{ client.name }}</div>
                <div class="text-sm text-cream-faint">{{ client.company }}</div>
              </div>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Contact details -->
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:mail" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide mb-0.5">Email</div>
                  <div class="text-xs text-cream">{{ client.email }}</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:phone" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide mb-0.5">Phone</div>
                  <div class="text-xs text-cream">{{ client.phone }}</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:map-pin" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide mb-0.5">Address</div>
                  <div class="text-xs text-cream leading-relaxed">{{ client.address || '—' }}</div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:tag" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide mb-0.5">Type</div>
                  <span :class="['status-badge', client.type === 'B2B' ? 'tag-b2b' : 'tag-b2c']">{{ client.type }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <template v-if="client.notes">
              <div class="h-px bg-charcoal-700"></div>
              <div>
                <div class="text-[10px] text-cream-faint uppercase tracking-wide mb-2">Notes</div>
                <p class="text-xs text-cream-muted leading-relaxed">{{ client.notes }}</p>
              </div>
            </template>
          </div>

          <!-- Invoice status donut -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
            <h3 class="text-sm font-semibold text-cream mb-4">Invoice Breakdown</h3>
            <div v-if="donutTotal > 0" class="flex items-center gap-5">
              <div class="relative shrink-0">
                <svg :viewBox="`0 0 ${cx * 2} ${cy * 2}`" class="w-24 h-24">
                  <circle
                    v-for="arc in donutArcs" :key="arc.label"
                    :cx="cx" :cy="cy" :r="R"
                    fill="none" :stroke="arc.color" :stroke-width="sw"
                    :stroke-dasharray="arc.dashArr" :stroke-dashoffset="arc.dashOff"
                    stroke-linecap="butt"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-xl font-bold text-cream leading-none">{{ donutTotal }}</span>
                  <span class="text-[9px] text-cream-faint mt-0.5">total</span>
                </div>
              </div>
              <div class="flex flex-col gap-2 flex-1">
                <div v-for="seg in donutSegments" :key="seg.label" class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: seg.color }" />
                    <span class="text-xs text-cream-muted">{{ seg.label }}</span>
                  </div>
                  <span class="text-xs font-semibold text-cream">{{ seg.value }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-cream-faint text-center py-4">No invoices yet</div>
          </div>

        </div>

        <!-- ── Right column ─────────────────────────────── -->
        <div class="flex flex-col gap-5">

          <!-- Stat cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
              <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                <Icon icon="lucide:dollar-sign" class="w-4 h-4 text-green-400" />
              </div>
              <div class="text-xl font-bold text-cream tracking-tight">{{ fmt(totalBilled) }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Total Paid</div>
            </div>
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
              <div class="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center mb-3">
                <Icon icon="lucide:clock" class="w-4 h-4 text-amber" />
              </div>
              <div class="text-xl font-bold text-cream tracking-tight">{{ fmt(outstanding) }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Outstanding</div>
            </div>
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <Icon icon="lucide:file-text" class="w-4 h-4 text-blue-400" />
              </div>
              <div class="text-xl font-bold text-cream tracking-tight">{{ invoices.length }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Invoices</div>
            </div>
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
              <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                <Icon icon="lucide:bar-chart-2" class="w-4 h-4 text-purple-400" />
              </div>
              <div class="text-xl font-bold text-cream tracking-tight">{{ fmt(avgInvoice) }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Avg Invoice</div>
            </div>
          </div>

          <!-- Revenue chart -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="text-sm font-semibold text-cream">Revenue from {{ client.name.split(' ')[0] }}</h3>
                <p class="text-xs text-cream-faint mt-0.5">Paid invoices over time</p>
              </div>
              <div class="flex items-center gap-0.5 bg-charcoal-700 rounded-lg p-0.5">
                <button
                  v-for="p in periods" :key="p"
                  @click="activePeriod = p"
                  :class="['text-xs font-medium px-2.5 py-1 rounded-md transition-colors', activePeriod === p ? 'bg-amber text-charcoal-900' : 'text-cream-muted hover:text-cream']"
                >{{ p }}</button>
              </div>
            </div>
            <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full" style="height:120px" preserveAspectRatio="none">
              <defs>
                <linearGradient id="clientBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#e8a83e" />
                  <stop offset="100%" stop-color="#e8a83e" stop-opacity="0.2" />
                </linearGradient>
              </defs>
              <rect v-for="(bar, i) in bars" :key="i" :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h" rx="3" fill="url(#clientBarGrad)" />
              <text v-for="(bar, i) in bars" :key="'l'+i" :x="bar.labelX" :y="chartH - 4" text-anchor="middle" font-size="7" fill="#6b7280">{{ bar.label }}</text>
            </svg>
          </div>

          <!-- Invoices table -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl">
            <div class="flex items-center justify-between px-5 py-4 border-b border-charcoal-700">
              <h3 class="text-sm font-semibold text-cream">Invoices</h3>
              <button class="text-xs text-amber hover:text-amber-light transition-colors flex items-center gap-1">
                New Invoice <Icon icon="lucide:plus" class="w-3 h-3" />
              </button>
            </div>

            <div v-if="invoices.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
              <Icon icon="lucide:file-text" class="w-8 h-8 text-cream-faint/40 mb-3" />
              <p class="text-xs text-cream-faint">No invoices yet for this client</p>
            </div>

            <div v-else>
              <!-- Desktop table -->
              <div class="hidden sm:block overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-charcoal-700">
                      <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-5 py-3">Invoice</th>
                      <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Description</th>
                      <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Amount</th>
                      <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Status</th>
                      <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="inv in invoices" :key="inv.id"
                      class="border-b border-charcoal-700 last:border-0 hover:bg-charcoal-700/40 transition-colors cursor-pointer"
                    >
                      <td class="px-5 py-3.5 text-xs font-mono text-cream-faint">{{ inv.id }}</td>
                      <td class="px-3 py-3.5 text-sm text-cream-muted">{{ inv.description }}</td>
                      <td class="px-3 py-3.5 text-sm font-semibold text-cream">${{ inv.amount.toLocaleString() }}</td>
                      <td class="px-3 py-3.5">
                        <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', statusConfig[inv.status].classes]">
                          {{ statusConfig[inv.status].label }}
                        </span>
                      </td>
                      <td class="px-3 py-3.5 text-sm text-cream-muted">{{ inv.date }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile list -->
              <div class="sm:hidden divide-y divide-charcoal-700">
                <div
                  v-for="inv in invoices" :key="inv.id"
                  class="flex items-center justify-between px-4 py-3.5"
                >
                  <div>
                    <div class="text-xs font-mono text-cream-faint">{{ inv.id }}</div>
                    <div class="text-sm text-cream mt-0.5">{{ inv.description }}</div>
                    <div class="text-xs text-cream-faint mt-0.5">{{ inv.date }}</div>
                  </div>
                  <div class="flex flex-col items-end gap-1.5">
                    <span class="text-sm font-semibold text-cream">${{ inv.amount.toLocaleString() }}</span>
                    <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[inv.status].classes]">
                      {{ statusConfig[inv.status].label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>

    <!-- Delete confirm overlay -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-cream">Delete client?</h3>
              <p class="text-xs text-cream-faint mt-1 leading-relaxed">
                This will permanently delete <span class="text-cream font-medium">{{ client?.name }}</span> and all associated records. This action cannot be undone.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="showDeleteConfirm = false"
              class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              Delete client
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
