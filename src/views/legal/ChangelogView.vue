<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSeo } from '@/composables/useSeo'

const router = useRouter()

useSeo({
  title: 'Changelog',
  description: 'See what\'s new in Flowtali — product updates, new features, and improvements.',
  canonical: 'https://flowtali.com/changelog',
})

type ChangeType = 'new' | 'improved' | 'fix'

interface Release {
  version: string
  date: string
  badge: string | null
  changes: { type: ChangeType; text: string }[]
}

const releases: Release[] = [
  {
    version: 'v1.7',
    date: 'June 2026',
    badge: 'Latest',
    changes: [
      { type: 'new', text: 'First-login welcome modal — new users are greeted with a "Take a tour" prompt on their first sign-in, with the option to skip.' },
      { type: 'new', text: 'Interactive tour guide — a step-by-step spotlight walkthrough covers key features; steps are automatically tailored to personal vs. organisation accounts.' },
      { type: 'new', text: 'Mobile bottom navigation — a persistent bottom nav bar on mobile with quick access to Home, Invoices, Clients, and a FAB shortcut to create a new invoice. A slide-up "More" sheet provides access to all other sections.' },
      { type: 'improved', text: 'Invoices, receipts, clients, and members list views now render mobile-optimised card layouts with inline quick-actions instead of desktop-only tables.' },
      { type: 'improved', text: 'Invoice, receipt, and letterhead editors now adapt to mobile: the form panel expands to full width, and a new eye-icon "Preview" tab lets you switch to the live document preview without leaving the editor.' },
      { type: 'improved', text: 'Action button rows on invoice, receipt, and letterhead view pages collapse to icon-only buttons on mobile to prevent overflow, with tooltips preserving discoverability.' },
      { type: 'fix', text: 'Invoice and receipt document previews on view pages are now horizontally scrollable on mobile — previously the right-hand columns (Rate, Amount) were clipped with no way to reach them.' },
    ],
  },
  {
    version: 'v1.6',
    date: 'June 2026',
    badge: null,
    changes: [
      { type: 'fix', text: 'API Keys section in Organization Preferences is now hidden for personal accounts — it is only relevant to organization accounts.' },
      { type: 'fix', text: 'Stamp selector buttons in the invoice and letterhead editors no longer appear empty — resolved a data normalization issue where stamps saved in a legacy format were not converted before being sent to the frontend.' },
      { type: 'fix', text: 'Google sign-up profile picture is now correctly downloaded and stored in our own storage on account creation — previously the Google-hosted URL was stored directly, causing broken avatar images.' },
      { type: 'improved', text: 'Feedback panel now anchors to the bottom-right corner on desktop instead of the centre-right.' },
    ],
  },
  {
    version: 'v1.5',
    date: 'June 2026',
    badge: null,
    changes: [
      { type: 'new', text: 'Embed SDK — embed any Flowtali view (invoices, projects, receipts, preferences and more) directly in your own product or website using a lightweight JavaScript SDK.' },
      { type: 'new', text: 'API key management — generate publishable and secret key pairs per organization to authenticate embedded sessions.' },
      { type: 'new', text: 'Embed token generation — issue short-lived, permission-scoped JWTs for your users so the embedded view auto-authenticates without a separate login.' },
      { type: 'new', text: 'Runtime theming — customize the embed appearance (primary color, background, font, border radius) by passing an appearance object to the SDK.' },
      { type: 'new', text: 'Embed event callbacks — listen for invoice.created, project.created, receipt.created and more from the parent page via ft.on().' },
      { type: 'fix', text: 'Fixed search icon overlapping placeholder text in all search bar instances across the app.' },
    ],
  },
  {
    version: 'v1.4',
    date: 'May 2026',
    badge: null,
    changes: [
      { type: 'new', text: 'Multi-role assignment — members can now hold more than one role per organization.' },
      { type: 'new', text: 'Tax type configuration — choose between percentage or flat-amount tax on invoices.' },
      { type: 'new', text: 'Invoice quick-fill profiles in Preferences — save sender details to auto-populate new invoices.' },
      { type: 'new', text: 'Bank account management — store and reuse payment details across invoices.' },
      { type: 'new', text: 'Stamp field in Preferences — add a custom text stamp that appears on your documents.' },
      { type: 'improved', text: 'Permission matrix UI redesigned for clarity when managing roles.' },
      { type: 'fix', text: 'Fixed an issue where invite emails occasionally landed in spam due to incorrect sender headers.' },
    ],
  },
  {
    version: 'v1.3',
    date: 'April 2026',
    badge: null,
    changes: [
      { type: 'new', text: 'Two-factor authentication (2FA) — enable TOTP-based MFA from your security settings.' },
      { type: 'new', text: 'Dashboard analytics — live charts for invoice volume, revenue, and outstanding balances.' },
      { type: 'new', text: 'Recent invoices panel on the dashboard for quick access to your latest documents.' },
      { type: 'new', text: 'Invoice status chart — visual breakdown of paid, pending, and overdue invoices.' },
      { type: 'improved', text: 'Dashboard now loads 40% faster due to parallelised API requests.' },
      { type: 'fix', text: 'Fixed date formatting inconsistency on invoices when the system locale is non-English.' },
    ],
  },
  {
    version: 'v1.2',
    date: 'March 2026',
    badge: null,
    changes: [
      { type: 'new', text: 'Receipt generator — create and share professional payment receipts.' },
      { type: 'new', text: 'Client management — store and reuse client details scoped to your organization.' },
      { type: 'new', text: 'Role-based access control — create custom roles with fine-grained permissions.' },
      { type: 'new', text: 'Audit log — view a full history of actions taken within your organization.' },
      { type: 'improved', text: 'Public share pages now render faster and include Open Graph metadata for link previews.' },
      { type: 'fix', text: 'Resolved a PDF export bug that caused signatures to appear blurred on retina displays.' },
    ],
  },
  {
    version: 'v1.1',
    date: 'February 2026',
    badge: null,
    changes: [
      { type: 'new', text: 'Letterhead generator — create branded letterheads with live preview and PDF export.' },
      { type: 'new', text: 'Six letterhead themes to choose from at launch.' },
      { type: 'new', text: 'Share links with optional access codes for private document sharing.' },
      { type: 'new', text: 'Member invitations — invite teammates to your organization by email.' },
      { type: 'improved', text: 'Invoice editor redesigned with a cleaner layout and inline line-item editing.' },
      { type: 'fix', text: 'Fixed currency symbol placement for RTL currencies.' },
    ],
  },
  {
    version: 'v1.0',
    date: 'January 2026',
    badge: 'Launch',
    changes: [
      { type: 'new', text: 'Invoice generator — create professional invoices with real-time preview.' },
      { type: 'new', text: 'Organization accounts — manage your team and documents in one workspace.' },
      { type: 'new', text: 'Google OAuth and magic-link sign-in.' },
      { type: 'new', text: '11+ currencies supported out of the box.' },
      { type: 'new', text: 'Subscription billing with free and paid tiers.' },
    ],
  },
]

const typeConfig: Record<ChangeType, { label: string; classes: string }> = {
  new:      { label: 'New',      classes: 'bg-amber/10 text-amber border-amber/20' },
  improved: { label: 'Improved', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  fix:      { label: 'Fix',      classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
}
</script>

<template>
  <div class="min-h-screen bg-charcoal-900 text-cream">

    <!-- Nav -->
    <header class="border-b border-charcoal-800 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-cream-muted hover:text-cream transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Back
      </button>
      <router-link to="/" class="font-display text-lg font-bold text-amber">Flowtali</router-link>
    </header>

    <!-- Hero -->
    <main class="max-w-3xl mx-auto px-6 py-14">
      <div class="mb-14">
        <div class="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 text-amber text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
          Product Updates
        </div>
        <h1 class="text-4xl font-bold font-display text-cream mb-3">Changelog</h1>
        <p class="text-cream-muted leading-relaxed">New features, improvements, and fixes — in chronological order.</p>
      </div>

      <!-- Timeline -->
      <div class="relative">
        <div class="absolute left-0 top-0 bottom-0 w-px bg-charcoal-700 ml-[5px]"></div>

        <div v-for="release in releases" :key="release.version" class="relative pl-10 mb-14 last:mb-0">
          <!-- Dot -->
          <div class="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-amber border-2 border-charcoal-900"></div>

          <!-- Header -->
          <div class="flex items-center gap-3 mb-5">
            <span class="text-xl font-bold font-display text-cream">{{ release.version }}</span>
            <span v-if="release.badge" class="text-xs font-semibold px-2 py-0.5 rounded-full border"
              :class="release.badge === 'Latest' ? 'bg-amber/10 text-amber border-amber/20' : 'bg-charcoal-700 text-cream-muted border-charcoal-600'">
              {{ release.badge }}
            </span>
            <span class="text-sm text-cream-faint ml-auto">{{ release.date }}</span>
          </div>

          <!-- Changes -->
          <div class="space-y-3">
            <div v-for="(change, i) in release.changes" :key="i" class="flex items-start gap-3">
              <span class="mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                :class="typeConfig[change.type].classes">
                {{ typeConfig[change.type].label }}
              </span>
              <p class="text-sm text-cream-muted leading-relaxed">{{ change.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-charcoal-800 mt-8 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-cream-faint">
        <router-link :to="{ name: 'privacy' }" class="hover:text-cream transition-colors">Privacy Policy</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-cream transition-colors">Terms of Service</router-link>
        <router-link :to="{ name: 'contact' }" class="hover:text-cream transition-colors">Contact</router-link>
      </div>
      <p class="text-xs text-cream-faint/50 mt-4">© {{ new Date().getFullYear() }} Flowtali. All rights reserved.</p>
    </footer>
  </div>
</template>
