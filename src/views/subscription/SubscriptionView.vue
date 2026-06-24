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
    <div class="bg-green-700/5 border border-green-700/25 rounded-xl p-5 md:p-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="font-sans text-2xl font-semibold text-gray-1000">Pro Plan</span>
            <span class="status-badge status-active">Active</span>
          </div>
          <p class="text-sm text-gray-900 mb-1">$10/month · Billed annually · Next renewal Dec 1, 2025</p>
          <p class="text-xs text-gray-700">Unlimited invoices, all letterhead templates, custom branding</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="text-xs text-gray-900 bg-gray-200 border border-gray-400 hover:border-gray-500 hover:text-gray-1000 px-3 py-2 rounded-lg transition-colors">
            Manage Billing
          </button>
          <button class="text-xs font-semibold text-bg-100 bg-green-700 hover:bg-green-800 px-3 py-2 rounded-lg transition-colors">
            Upgrade to Business
          </button>
        </div>
      </div>
    </div>

    <!-- Plan comparison -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="plan in plans" :key="plan.name"
        :class="['bg-gray-200 border rounded-xl p-5', plan.current ? 'border-green-700/30' : 'border-gray-400']"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="text-xs text-gray-700 font-medium mb-1">{{ plan.name }}</div>
            <div class="font-sans text-3xl font-semibold text-gray-1000">
              ${{ plan.price }}<span class="text-sm text-gray-700 font-sans">/mo</span>
            </div>
          </div>
          <span v-if="plan.current" class="status-badge role-owner text-[9px]">Current</span>
        </div>

        <ul class="space-y-2 mb-5">
          <li v-for="f in plan.features" :key="f" class="flex items-center gap-2 text-xs text-gray-900">
            <Icon icon="lucide:check" class="w-3.5 h-3.5 text-green-400 shrink-0" />
            {{ f }}
          </li>
        </ul>

        <button
          :class="[
            'w-full py-2 rounded-lg text-xs font-semibold transition-colors',
            plan.current
              ? 'bg-gray-400 text-gray-900 cursor-default'
              : 'bg-green-700 hover:bg-green-800 text-bg-100',
          ]"
          :disabled="plan.current"
        >
          {{ plan.cta }}
        </button>
      </div>
    </div>

    <!-- Billing history -->
    <div class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-400">
        <h3 class="text-sm font-semibold text-gray-1000">Billing History</h3>
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
            <td class="font-mono text-xs text-gray-900">{{ bill.id }}</td>
            <td class="font-mono font-medium text-gray-1000">{{ bill.amount }}</td>
            <td><span class="status-badge status-paid">{{ bill.status }}</span></td>
            <td class="text-xs text-gray-700">{{ bill.date }}</td>
            <td>
              <button class="text-xs text-green-700 hover:text-green-800 flex items-center gap-1 transition-colors">
                <Icon icon="lucide:download" class="w-3 h-3" /> Download PDF
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
