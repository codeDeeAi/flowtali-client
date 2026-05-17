<script setup lang="ts">
import { Icon } from '@iconify/vue';

const stamps = [
  { text: 'PAID',     color: '#4ade80' },
  { text: 'DUE',      color: '#e8a83e' },
  { text: 'DRAFT',    color: '#6b7280' },
  { text: 'OVERDUE',  color: '#f87171' },
  { text: 'APPROVED', color: '#60a5fa' },
  { text: 'VOID',     color: '#9ca3af' },
];

const signatures = [
  { name: 'Ada Lovelace', role: 'Creative Director', preview: 'Ada L.' },
  { name: 'Marcus Bell',  role: 'Project Manager',   preview: 'Marcus' },
];

const brandColors = [
  { name: 'Brand Gold',    hex: '#E8A83E' },
  { name: 'Deep Charcoal', hex: '#111113' },
  { name: 'Cream White',   hex: '#F5F0E8' },
  { name: 'Electric Blue', hex: '#60A5FA' },
];

const orgLogos = [
  { name: 'Primary Logo (Light)', size: 'PNG · 420×120px', preview: 'ACME', color: '#e8a83e' },
  { name: 'Primary Logo (Dark)',  size: 'PNG · 420×120px', preview: 'ACME', color: '#111113' },
  { name: 'Icon Only',            size: 'PNG · 120×120px', preview: 'A',    color: '#e8a83e' },
];
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">Organization Preferences</h1>
      <p class="page-subtitle">Saved assets and defaults for Acme Design Studio</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Saved Stamps -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Saved Stamps</h3>
          <button class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors">
            <Icon icon="lucide:plus" class="w-3 h-3" /> Add Stamp
          </button>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="stamp in stamps" :key="stamp.text"
            class="flex flex-col items-center gap-2 p-3 border border-charcoal-700 hover:border-charcoal-500 rounded-lg cursor-pointer transition-colors"
          >
            <div
              class="w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono font-bold text-center leading-tight"
              style="transform: rotate(-15deg); font-size: 8px; letter-spacing: 0.05em;"
              :style="{ borderColor: stamp.color, color: stamp.color }"
            >
              {{ stamp.text }}
            </div>
            <span class="text-[10px] text-cream-faint">{{ stamp.text }}</span>
          </div>
        </div>
      </div>

      <!-- Saved Signatures -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Saved Signatures</h3>
          <button class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors">
            <Icon icon="lucide:upload" class="w-3 h-3" /> Upload
          </button>
        </div>
        <div class="space-y-3">
          <div
            v-for="sig in signatures" :key="sig.name"
            class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg"
          >
            <div class="w-20 h-9 bg-charcoal-900 border border-charcoal-600 rounded flex items-center justify-center shrink-0">
              <span class="font-display text-sm text-cream-muted italic">{{ sig.preview }}</span>
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium text-cream">{{ sig.name }}</div>
              <div class="text-xs text-cream-faint">{{ sig.role }}</div>
            </div>
            <button class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Brand Colors -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Brand Colors</h3>
          <button class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors">
            <Icon icon="lucide:plus" class="w-3 h-3" /> Add Color
          </button>
        </div>
        <div class="flex flex-wrap gap-3">
          <div
            v-for="color in brandColors" :key="color.hex"
            class="flex items-center gap-2.5 px-3 py-2 border border-charcoal-700 rounded-lg hover:border-charcoal-500 transition-colors"
          >
            <div class="w-5 h-5 rounded" :style="{ backgroundColor: color.hex, border: '1px solid rgba(255,255,255,0.1)' }"></div>
            <div>
              <div class="text-xs font-medium text-cream">{{ color.name }}</div>
              <div class="text-[10px] font-mono text-cream-faint">{{ color.hex }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Org Logos -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Organization Logos</h3>
          <button class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors">
            <Icon icon="lucide:upload" class="w-3 h-3" /> Upload
          </button>
        </div>
        <div class="space-y-3">
          <div
            v-for="logo in orgLogos" :key="logo.name"
            class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg"
          >
            <div class="w-14 h-9 bg-white rounded flex items-center justify-center shrink-0">
              <span class="text-xs font-bold" :style="{ color: logo.color }">{{ logo.preview }}</span>
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium text-cream">{{ logo.name }}</div>
              <div class="text-xs text-cream-faint">{{ logo.size }}</div>
            </div>
            <button class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
