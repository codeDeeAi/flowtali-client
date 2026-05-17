<script setup lang="ts">
interface Invoice {
  id: string;
  client: string;
  email: string;
  amount: string;
  status: 'PAID' | 'DUE' | 'OVERDUE' | 'DRAFT';
  date: string;
  avatarColor: string;
}

const invoices: Invoice[] = [
  { id: 'INV-0042', client: 'Globex Corp',   email: 'billing@globex.com',  amount: '$8,550', status: 'PAID',    date: 'Mar 15', avatarColor: '#4ade80' },
  { id: 'INV-0041', client: 'Pixel Works',   email: 'accounts@pxl.io',     amount: '$3,200', status: 'DUE',     date: 'Mar 10', avatarColor: '#a78bfa' },
  { id: 'INV-0040', client: 'Nova Agency',   email: 'finance@nova.co',     amount: '$5,800', status: 'OVERDUE', date: 'Feb 28', avatarColor: '#f87171' },
  { id: 'INV-0039', client: 'Bright Minds',  email: 'pay@brightminds.io',  amount: '$1,200', status: 'PAID',    date: 'Feb 20', avatarColor: '#34d399' },
  { id: 'INV-0038', client: 'Studio X',      email: 'hello@studiox.co',    amount: '$7,000', status: 'DRAFT',   date: 'Mar 18', avatarColor: '#fbbf24' },
  { id: 'INV-0037', client: 'Frontier Tech', email: 'ar@frontier.tech',    amount: '$4,400', status: 'PAID',    date: 'Feb 12', avatarColor: '#38bdf8' },
];

const statusConfig = {
  PAID:    { label: 'Paid',    classes: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  DUE:     { label: 'Due',     classes: 'bg-amber/10 text-amber border border-amber/20' },
  OVERDUE: { label: 'Overdue', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  DRAFT:   { label: 'Draft',   classes: 'bg-charcoal-600 text-cream-muted border border-charcoal-500' },
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-charcoal-700">
      <h3 class="text-sm font-semibold text-cream">Recent Invoices</h3>
      <a href="#" class="text-xs text-amber hover:text-amber-light transition-colors flex items-center gap-1">
        View all
        <span>→</span>
      </a>
    </div>

    <!-- Table (desktop) -->
    <div class="hidden sm:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-charcoal-700">
            <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-5 py-3">Client</th>
            <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Amount</th>
            <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Status</th>
            <th class="text-left text-[10px] font-semibold uppercase tracking-wider text-cream-faint px-3 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inv in invoices"
            :key="inv.id"
            class="border-b border-charcoal-700 last:border-0 hover:bg-charcoal-700/40 transition-colors"
          >
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0"
                  :style="{ backgroundColor: inv.avatarColor }"
                >
                  {{ initials(inv.client) }}
                </div>
                <div>
                  <div class="text-sm font-medium text-cream leading-tight">{{ inv.client }}</div>
                  <div class="text-xs text-cream-faint">{{ inv.id }}</div>
                </div>
              </div>
            </td>
            <td class="px-3 py-3.5 text-sm font-semibold text-cream">{{ inv.amount }}</td>
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
        v-for="inv in invoices"
        :key="inv.id"
        class="flex items-center justify-between px-4 py-3.5 hover:bg-charcoal-700/40 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0"
            :style="{ backgroundColor: inv.avatarColor }"
          >
            {{ initials(inv.client) }}
          </div>
          <div>
            <div class="text-sm font-medium text-cream">{{ inv.client }}</div>
            <div class="text-xs text-cream-faint">{{ inv.id }} · {{ inv.date }}</div>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1.5">
          <span class="text-sm font-semibold text-cream">{{ inv.amount }}</span>
          <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[inv.status].classes]">
            {{ statusConfig[inv.status].label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
