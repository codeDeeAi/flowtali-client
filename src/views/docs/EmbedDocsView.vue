<script setup lang="ts">
import { ref } from 'vue'
import { useSeo } from '@/composables/useSeo'

useSeo({
  title: 'Embed SDK Docs — Flowtali',
  description: 'Learn how to embed Flowtali invoices, projects, receipts, and more in your own product using the Flowtali Embed SDK.',
  canonical: 'https://flowtali.com/docs/embed',
})

const activeSection = ref('overview')

const sections = [
  { id: 'overview',      label: 'Overview' },
  { id: 'quickstart',    label: 'Quick start' },
  { id: 'auth',          label: 'Authentication' },
  { id: 'views',         label: 'Available views' },
  { id: 'appearance',    label: 'Appearance / theming' },
  { id: 'events',        label: 'Events' },
  { id: 'reference',     label: 'SDK reference' },
]

function scrollTo(id: string) {
  activeSection.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="min-h-screen bg-charcoal-900 text-cream">
    <!-- Header -->
    <header class="border-b border-charcoal-700/40 bg-charcoal-900/95 backdrop-blur sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <router-link to="/" class="flex items-center gap-2 text-cream hover:text-amber transition-colors">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-amber to-amber-light flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h4"/></svg>
            </div>
            <span class="font-display font-semibold text-lg">Flowtali</span>
          </router-link>
          <span class="text-charcoal-500">/</span>
          <span class="text-cream-muted text-sm">Embed SDK Docs</span>
        </div>
        <router-link to="/app/dashboard" class="text-xs text-amber hover:underline">Open app →</router-link>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6 flex gap-12 py-12">
      <!-- Sidebar nav -->
      <aside class="hidden lg:block w-52 flex-shrink-0 sticky top-24 h-fit">
        <p class="text-cream-faint text-xs font-semibold uppercase tracking-widest mb-4">On this page</p>
        <nav class="flex flex-col gap-1">
          <button
            v-for="s in sections" :key="s.id"
            @click="scrollTo(s.id)"
            class="text-left text-sm px-3 py-1.5 rounded-lg transition-colors"
            :class="activeSection === s.id ? 'text-amber bg-amber/8' : 'text-cream-muted hover:text-cream'"
          >{{ s.label }}</button>
        </nav>
      </aside>

      <!-- Content -->
      <main class="flex-1 min-w-0 max-w-3xl">

        <!-- Overview -->
        <section id="overview" class="mb-16 scroll-mt-24">
          <div class="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 text-amber text-xs font-medium px-3 py-1 rounded-full mb-5">New in v1.5</div>
          <h1 class="font-display text-4xl md:text-5xl font-semibold text-cream mb-4">Embed SDK</h1>
          <p class="text-cream-muted text-lg leading-relaxed mb-6">
            The Flowtali Embed SDK lets you embed any Flowtali view — invoices, projects, receipts, preferences, and more — directly in your own website or SaaS product. Your users get the full Flowtali experience without leaving your platform.
          </p>
          <div class="grid sm:grid-cols-3 gap-4 mt-8">
            <div class="bg-charcoal-800/60 border border-charcoal-700/40 rounded-xl p-4">
              <div class="text-amber text-lg mb-2">⚡</div>
              <div class="text-cream text-sm font-medium mb-1">One script tag</div>
              <div class="text-cream-muted text-xs leading-relaxed">Drop in a single JS file and call three lines of code.</div>
            </div>
            <div class="bg-charcoal-800/60 border border-charcoal-700/40 rounded-xl p-4">
              <div class="text-amber text-lg mb-2">🔐</div>
              <div class="text-cream text-sm font-medium mb-1">JWT-based auth</div>
              <div class="text-cream-muted text-xs leading-relaxed">Your backend issues short-lived tokens. No shared passwords.</div>
            </div>
            <div class="bg-charcoal-800/60 border border-charcoal-700/40 rounded-xl p-4">
              <div class="text-amber text-lg mb-2">🎨</div>
              <div class="text-cream text-sm font-medium mb-1">Fully themeable</div>
              <div class="text-cream-muted text-xs leading-relaxed">Match your brand with colors, fonts, and border radius.</div>
            </div>
          </div>
        </section>

        <!-- Quick start -->
        <section id="quickstart" class="mb-16 scroll-mt-24">
          <h2 class="font-display text-3xl font-semibold text-cream mb-2">Quick start</h2>
          <p class="text-cream-muted text-sm mb-6">Get an invoice list embedded in 5 minutes.</p>

          <div class="flex flex-col gap-6">
            <!-- Step 1 -->
            <div>
              <div class="flex items-center gap-3 mb-3">
                <div class="w-6 h-6 rounded-full bg-amber/20 text-amber text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                <h3 class="text-cream font-medium">Generate an API key in Flowtali</h3>
              </div>
              <p class="text-cream-muted text-sm ml-9 mb-3">Go to <strong class="text-cream">Settings → API Keys</strong> in your organization and create a new key. You'll receive a <code class="code-inline">pk_live_</code> (publishable) and a <code class="code-inline">sk_live_</code> (secret) key. Store the secret key securely on your backend.</p>
            </div>

            <!-- Step 2 -->
            <div>
              <div class="flex items-center gap-3 mb-3">
                <div class="w-6 h-6 rounded-full bg-amber/20 text-amber text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                <h3 class="text-cream font-medium">Generate an embed token from your backend</h3>
              </div>
              <p class="text-cream-muted text-sm ml-9 mb-3">When a user logs into your product, your server calls the Flowtali API to get a short-lived token for them:</p>
              <div class="code-block ml-9">
                <div class="code-lang">Node.js / Express</div>
                <pre class="code-pre"><code>// Your backend — keep sk_live_ server-side only
const res = await fetch('https://flowtali.com/api/v1/orgs/ORG_ID/embed/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_your_secret_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_reference: req.user.id,           // your own user ID
    permissions: ['invoices.read', 'invoices.create'],
    expires_in: 3600,                      // seconds (max 86400)
  }),
})

const { data } = await res.json()
const embedToken = data.token             // pass this to your frontend</code></pre>
              </div>
            </div>

            <!-- Step 3 -->
            <div>
              <div class="flex items-center gap-3 mb-3">
                <div class="w-6 h-6 rounded-full bg-amber/20 text-amber text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                <h3 class="text-cream font-medium">Add the SDK and mount the embed</h3>
              </div>
              <div class="code-block ml-9">
                <div class="code-lang">HTML</div>
                <pre class="code-pre"><code>&lt;!-- Add the SDK --&gt;
&lt;script src="https://flowtali.com/sdk/flowtali.js"&gt;&lt;/script&gt;

&lt;!-- A container div --&gt;
&lt;div id="flowtali-embed" style="height: 600px;"&gt;&lt;/div&gt;

&lt;script&gt;
  const ft = Flowtali.init('pk_live_your_publishable_key')

  ft.mount('#flowtali-embed', {
    view: 'invoices',
    token: '{{ embedToken }}',   // token from your backend
  })
&lt;/script&gt;</code></pre>
              </div>
            </div>
          </div>
        </section>

        <!-- Auth -->
        <section id="auth" class="mb-16 scroll-mt-24">
          <h2 class="font-display text-3xl font-semibold text-cream mb-2">Authentication</h2>
          <p class="text-cream-muted text-sm mb-6">The embed uses a two-key system, similar to Stripe.</p>

          <div class="bg-charcoal-800/50 border border-charcoal-700/40 rounded-xl p-5 mb-6">
            <div class="grid sm:grid-cols-2 gap-6">
              <div>
                <div class="text-xs font-semibold text-amber uppercase tracking-wider mb-2">Publishable key <code class="code-inline">pk_live_</code></div>
                <p class="text-cream-muted text-sm leading-relaxed">Safe to use in your frontend / browser. Passed to <code class="code-inline">Flowtali.init()</code>. Identifies your organization but cannot generate tokens.</p>
              </div>
              <div>
                <div class="text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">Secret key <code class="code-inline">sk_live_</code></div>
                <p class="text-cream-muted text-sm leading-relaxed">Server-side only. Never expose in frontend code. Used to call <code class="code-inline">POST /embed/token</code> to generate short-lived embed tokens for your users.</p>
              </div>
            </div>
          </div>

          <h3 class="text-cream font-medium mb-3">Token permissions</h3>
          <p class="text-cream-muted text-sm mb-4">Each token carries a <code class="code-inline">permissions</code> array. The embed will only allow actions the token explicitly grants. Available permissions:</p>
          <div class="bg-charcoal-800/50 border border-charcoal-700/40 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead><tr class="border-b border-charcoal-700/40"><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">Permission</th><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">What it allows</th></tr></thead>
              <tbody class="divide-y divide-charcoal-700/20">
                <tr v-for="row in [
                  ['invoices.read', 'View invoice list and individual invoices'],
                  ['invoices.create', 'Create new invoices'],
                  ['invoices.update', 'Edit existing invoices'],
                  ['invoices.delete', 'Delete invoices'],
                  ['projects.read', 'View projects'],
                  ['projects.create / update / delete', 'Manage projects'],
                  ['receipts.read / create / update / delete', 'Manage receipts'],
                  ['clients.read / create / update / delete', 'Manage clients'],
                  ['letterheads.read / create / update / delete', 'Manage letterheads'],
                ]" :key="row[0]">
                  <td class="px-4 py-2.5"><code class="code-inline">{{ row[0] }}</code></td>
                  <td class="px-4 py-2.5 text-cream-muted">{{ row[1] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Views -->
        <section id="views" class="mb-16 scroll-mt-24">
          <h2 class="font-display text-3xl font-semibold text-cream mb-2">Available views</h2>
          <p class="text-cream-muted text-sm mb-6">Pass any of these as the <code class="code-inline">view</code> parameter to <code class="code-inline">ft.mount()</code> or <code class="code-inline">ft.open()</code>.</p>
          <div class="bg-charcoal-800/50 border border-charcoal-700/40 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead><tr class="border-b border-charcoal-700/40"><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">view</th><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">URL path</th><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">Permission needed</th></tr></thead>
              <tbody class="divide-y divide-charcoal-700/20">
                <tr v-for="row in [
                  ['invoices', '/embed/invoices', 'invoices.read'],
                  ['invoices/create', '/embed/invoices/create', 'invoices.create'],
                  ['invoices/:id', '/embed/invoices/INV_ID', 'invoices.read'],
                  ['projects', '/embed/projects', 'projects.read'],
                  ['receipts', '/embed/receipts', 'receipts.read'],
                  ['clients', '/embed/clients', 'clients.read'],
                  ['letterheads', '/embed/letterheads', 'letterheads.read'],
                  ['preferences', '/embed/preferences', 'settings.manage'],
                  ['dashboard', '/embed/dashboard', '—'],
                  ['analytics', '/embed/analytics', 'analytics.read'],
                ]" :key="row[0]">
                  <td class="px-4 py-2.5"><code class="code-inline">{{ row[0] }}</code></td>
                  <td class="px-4 py-2.5 text-cream-muted text-xs">{{ row[1] }}</td>
                  <td class="px-4 py-2.5"><code class="code-inline text-xs">{{ row[2] }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Appearance -->
        <section id="appearance" class="mb-16 scroll-mt-24">
          <h2 class="font-display text-3xl font-semibold text-cream mb-2">Appearance / theming</h2>
          <p class="text-cream-muted text-sm mb-6">Pass an <code class="code-inline">appearance</code> object to <code class="code-inline">Flowtali.init()</code> to match your brand. All properties are optional.</p>
          <div class="code-block">
            <div class="code-lang">JavaScript</div>
            <pre class="code-pre"><code>const ft = Flowtali.init('pk_live_...', {
  appearance: {
    primaryColor:    '#6366f1',    // buttons, links, active states (default: #e8a83e)
    backgroundColor: '#ffffff',    // iframe background (default: #111113)
    textColor:       '#111827',    // body text (default: #f5f0e8)
    fontFamily:      'Inter, sans-serif', // (default: DM Sans)
    borderRadius:    '8px',        // input / card radius (default: 7px)
  },
})</code></pre>
          </div>
          <p class="text-cream-muted text-sm mt-4">You can also override the appearance per-mount call:</p>
          <div class="code-block mt-3">
            <pre class="code-pre"><code>ft.mount('#container', {
  view: 'invoices',
  token: embedToken,
  appearance: { primaryColor: '#10b981' },  // overrides the init appearance
})</code></pre>
          </div>
        </section>

        <!-- Events -->
        <section id="events" class="mb-16 scroll-mt-24">
          <h2 class="font-display text-3xl font-semibold text-cream mb-2">Events</h2>
          <p class="text-cream-muted text-sm mb-6">Listen for actions happening inside the embed using <code class="code-inline">ft.on()</code>. Events are emitted after successful mutations.</p>
          <div class="code-block mb-6">
            <div class="code-lang">JavaScript</div>
            <pre class="code-pre"><code>ft.on('invoice.created', (invoice) => {
  console.log('New invoice:', invoice.id)
  // sync to your own system, show a toast, etc.
})

ft.on('project.updated', (project) => { ... })
ft.on('receipt.created', (receipt) => { ... })

// Catch all events
ft.on('*', (eventName, data) => {
  console.log(eventName, data)
})</code></pre>
          </div>
          <div class="bg-charcoal-800/50 border border-charcoal-700/40 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead><tr class="border-b border-charcoal-700/40"><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">Event</th><th class="text-left px-4 py-2.5 text-cream-faint text-xs uppercase tracking-wider">Fired when</th></tr></thead>
              <tbody class="divide-y divide-charcoal-700/20">
                <tr v-for="row in [
                  ['invoice.created', 'A new invoice is successfully created'],
                  ['invoice.updated', 'An invoice is edited and saved'],
                  ['invoice.deleted', 'An invoice is deleted'],
                  ['project.created / updated / deleted', 'Project mutations'],
                  ['receipt.created / updated / deleted', 'Receipt mutations'],
                  ['client.created / updated / deleted', 'Client mutations'],
                ]" :key="row[0]">
                  <td class="px-4 py-2.5"><code class="code-inline">{{ row[0] }}</code></td>
                  <td class="px-4 py-2.5 text-cream-muted">{{ row[1] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Reference -->
        <section id="reference" class="mb-16 scroll-mt-24">
          <h2 class="font-display text-3xl font-semibold text-cream mb-2">SDK reference</h2>

          <div class="flex flex-col gap-8 mt-6">
            <div>
              <h3 class="text-cream font-semibold font-mono text-sm mb-2">Flowtali.init(publishableKey, options?)</h3>
              <p class="text-cream-muted text-sm mb-3">Initializes the SDK. Returns a <code class="code-inline">FlowtaliInstance</code>.</p>
              <div class="bg-charcoal-800/50 border border-charcoal-700/40 rounded-xl overflow-hidden">
                <table class="w-full text-sm"><thead><tr class="border-b border-charcoal-700/40"><th class="text-left px-4 py-2 text-cream-faint text-xs uppercase tracking-wider">Option</th><th class="text-left px-4 py-2 text-cream-faint text-xs uppercase tracking-wider">Type</th><th class="text-left px-4 py-2 text-cream-faint text-xs uppercase tracking-wider">Description</th></tr></thead>
                <tbody class="divide-y divide-charcoal-700/20">
                  <tr><td class="px-4 py-2"><code class="code-inline">appearance</code></td><td class="px-4 py-2 text-cream-muted">object</td><td class="px-4 py-2 text-cream-muted">Default theme for all mounts from this instance.</td></tr>
                </tbody></table>
              </div>
            </div>

            <div>
              <h3 class="text-cream font-semibold font-mono text-sm mb-2">ft.mount(selector, options)</h3>
              <p class="text-cream-muted text-sm mb-3">Mounts the embed inside a container element.</p>
              <div class="bg-charcoal-800/50 border border-charcoal-700/40 rounded-xl overflow-hidden">
                <table class="w-full text-sm"><thead><tr class="border-b border-charcoal-700/40"><th class="text-left px-4 py-2 text-cream-faint text-xs uppercase tracking-wider">Option</th><th class="text-left px-4 py-2 text-cream-faint text-xs uppercase tracking-wider">Type</th><th class="text-left px-4 py-2 text-cream-faint text-xs uppercase tracking-wider">Description</th></tr></thead>
                <tbody class="divide-y divide-charcoal-700/20">
                  <tr><td class="px-4 py-2"><code class="code-inline">view</code></td><td class="px-4 py-2 text-cream-muted">string</td><td class="px-4 py-2 text-cream-muted">Which view to render. See Available views.</td></tr>
                  <tr><td class="px-4 py-2"><code class="code-inline">token</code></td><td class="px-4 py-2 text-cream-muted">string</td><td class="px-4 py-2 text-cream-muted">Embed JWT from your backend.</td></tr>
                  <tr><td class="px-4 py-2"><code class="code-inline">params</code></td><td class="px-4 py-2 text-cream-muted">object</td><td class="px-4 py-2 text-cream-muted">Optional query params passed to the view (e.g. <code class="code-inline">{ filter: 'unpaid' }</code>).</td></tr>
                  <tr><td class="px-4 py-2"><code class="code-inline">appearance</code></td><td class="px-4 py-2 text-cream-muted">object</td><td class="px-4 py-2 text-cream-muted">Per-mount theme override.</td></tr>
                </tbody></table>
              </div>
            </div>

            <div>
              <h3 class="text-cream font-semibold font-mono text-sm mb-2">ft.open(options)</h3>
              <p class="text-cream-muted text-sm">Same as <code class="code-inline">mount()</code> but renders the view in a centered modal overlay with a close button. Accepts the same options.</p>
            </div>

            <div>
              <h3 class="text-cream font-semibold font-mono text-sm mb-2">ft.on(event, handler) / ft.off(event, handler)</h3>
              <p class="text-cream-muted text-sm">Subscribe / unsubscribe from embed events. Use <code class="code-inline">'*'</code> to listen to all events.</p>
            </div>

            <div>
              <h3 class="text-cream font-semibold font-mono text-sm mb-2">ft.destroy()</h3>
              <p class="text-cream-muted text-sm">Removes the iframe / modal and clears all internal state. Call this when navigating away from the page that hosts the embed.</p>
            </div>

            <div>
              <h3 class="text-cream font-semibold font-mono text-sm mb-2">Flowtali.config({ baseUrl })</h3>
              <p class="text-cream-muted text-sm">Override the Flowtali base URL. Useful for self-hosted deployments or testing against a staging environment.</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  background: #0e0e10;
  border: 1px solid #2e2e37;
  border-radius: 10px;
  overflow: hidden;
  font-family: 'DM Mono', monospace;
}
.code-lang {
  background: #18181c;
  border-bottom: 1px solid #2e2e37;
  padding: 6px 14px;
  font-size: 11px;
  color: #6b6560;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.code-pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.7;
  color: #d4cfc8;
}
.code-inline {
  background: rgba(232,168,62,0.1);
  border: 1px solid rgba(232,168,62,0.15);
  color: #e8a83e;
  font-family: 'DM Mono', monospace;
  font-size: 0.8em;
  padding: 1px 5px;
  border-radius: 4px;
}
</style>
