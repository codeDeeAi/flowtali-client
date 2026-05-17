<script setup lang="ts">
import { Icon } from '@iconify/vue';

const plans = [
  {
    name: 'Starter', price: 0, current: false, cta: 'Downgrade',
    features: ['5 invoices/mo', '3 letterheads/mo', 'Basic templates', 'PDF export'],
  },
  {
    name: 'Pro', price: 10, current: true, cta: 'Current Plan',
    features: ['Unlimited invoices', 'All 5 templates', 'Custom branding', 'Signature upload', 'Stamp & watermark', 'API access'],
  },
  {
    name: 'Business', price: 23, current: false, cta: 'Upgrade',
    features: ['Everything in Pro', '5 team members', 'Client portal', 'Invoice analytics', 'Stripe payment links'],
  },
];

const billingHistory = [
  { id: 'FLW-2025-0003', amount: '$120.00', status: 'Paid', date: 'Dec 1, 2024' },
  { id: 'FLW-2024-0002', amount: '$120.00', status: 'Paid', date: 'Dec 1, 2023' },
  { id: 'FLW-2024-0001', amount: '$144.00', status: 'Paid', date: 'Dec 1, 2022' },
];
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">Subscription</h1>
      <p class="page-subtitle">Manage your plan and billing for Acme Design Studio</p>
    </div>

    <!-- Current plan hero -->
    <div class="bg-amber/5 border border-amber/25 rounded-xl p-5 md:p-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="font-display text-2xl font-semibold text-cream">Pro Plan</span>
            <span class="status-badge status-active">Active</span>
          </div>
          <p class="text-sm text-cream-muted mb-1">$10/month · Billed annually · Next renewal Dec 1, 2025</p>
          <p class="text-xs text-cream-faint">Unlimited invoices, all letterhead templates, custom branding</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="text-xs text-cream-muted bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 hover:text-cream px-3 py-2 rounded-lg transition-colors">
            Manage Billing
          </button>
          <button class="text-xs font-semibold text-charcoal-900 bg-amber hover:bg-amber-light px-3 py-2 rounded-lg transition-colors">
            Upgrade to Business
          </button>
        </div>
      </div>
    </div>

    <!-- Plan comparison -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="plan in plans" :key="plan.name"
        :class="['bg-charcoal-800 border rounded-xl p-5', plan.current ? 'border-amber/30' : 'border-charcoal-700']"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="text-xs text-cream-faint font-medium mb-1">{{ plan.name }}</div>
            <div class="font-display text-3xl font-semibold text-cream">
              ${{ plan.price }}<span class="text-sm text-cream-faint font-sans">/mo</span>
            </div>
          </div>
          <span v-if="plan.current" class="status-badge role-owner text-[9px]">Current</span>
        </div>

        <ul class="space-y-2 mb-5">
          <li v-for="f in plan.features" :key="f" class="flex items-center gap-2 text-xs text-cream-muted">
            <Icon icon="lucide:check" class="w-3.5 h-3.5 text-green-400 shrink-0" />
            {{ f }}
          </li>
        </ul>

        <button
          :class="[
            'w-full py-2 rounded-lg text-xs font-semibold transition-colors',
            plan.current
              ? 'bg-charcoal-700 text-cream-muted cursor-default'
              : 'bg-amber hover:bg-amber-light text-charcoal-900',
          ]"
          :disabled="plan.current"
        >
          {{ plan.cta }}
        </button>
      </div>
    </div>

    <!-- Billing history -->
    <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
      <div class="px-5 py-3.5 border-b border-charcoal-700">
        <h3 class="text-sm font-semibold text-cream">Billing History</h3>
      </div>
      <table class="app-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bill in billingHistory" :key="bill.id">
            <td class="font-mono text-xs text-cream-muted">{{ bill.id }}</td>
            <td class="font-mono font-medium text-cream">{{ bill.amount }}</td>
            <td><span class="status-badge status-paid">{{ bill.status }}</span></td>
            <td class="text-xs text-cream-faint">{{ bill.date }}</td>
            <td>
              <button class="text-xs text-amber hover:text-amber-light flex items-center gap-1 transition-colors">
                <Icon icon="lucide:download" class="w-3 h-3" /> Download PDF
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
