<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t, tm, rt } = useI18n()

useSeo({
  title: t('docs.seo.title'),
  description: t('docs.seo.description'),
  canonical: 'https://flowtali.com/docs/embed',
  localePath: '/docs/embed',
})

// Resolve a dotted-key description map (keys like "invoices.read") from i18n.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function descMap(key: string) {
  return computed<Record<string, string>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = tm(key) as Record<string, any>
    const out: Record<string, string> = {}
    for (const k in raw) out[k] = rt(raw[k])
    return out
  })
}
const permDescs = descMap('docs.permissions.descs')
const viewDescs = descMap('docs.views.descs')
const eventDescs = descMap('docs.events.descs')

const activeSection = ref('overview')

// Tab state for multi-language code blocks
const backendTab  = ref('node')
const frontendTab = ref('html')
const eventsTab   = ref('js')

const sections = [
  { id: 'overview',     label: 'Overview' },
  { id: 'quickstart',   label: 'Quick start' },
  { id: 'auth',         label: 'Authentication' },
  { id: 'permissions',  label: 'Permissions' },
  { id: 'views',        label: 'Available views' },
  { id: 'appearance',   label: 'Appearance' },
  { id: 'events',       label: 'Events' },
  { id: 'reference',    label: 'SDK reference' },
]

const allPermissions = [
  { perm: 'invoices.read',        desc: 'View invoice list and individual invoices' },
  { perm: 'invoices.create',      desc: 'Create new invoices' },
  { perm: 'invoices.update',      desc: 'Edit existing invoices' },
  { perm: 'invoices.delete',      desc: 'Delete invoices' },
  { perm: 'projects.read',        desc: 'View project list and individual projects' },
  { perm: 'projects.create',      desc: 'Create new projects' },
  { perm: 'projects.update',      desc: 'Edit existing projects' },
  { perm: 'projects.delete',      desc: 'Delete projects' },
  { perm: 'receipts.read',        desc: 'View receipt list and individual receipts' },
  { perm: 'receipts.create',      desc: 'Create new receipts' },
  { perm: 'receipts.update',      desc: 'Edit existing receipts' },
  { perm: 'receipts.delete',      desc: 'Delete receipts' },
  { perm: 'clients.read',         desc: 'View client list and individual client records' },
  { perm: 'clients.create',       desc: 'Create new clients' },
  { perm: 'clients.update',       desc: 'Edit existing clients' },
  { perm: 'clients.delete',       desc: 'Delete clients' },
  { perm: 'letterheads.read',     desc: 'View letterhead list and individual letterheads' },
  { perm: 'letterheads.create',   desc: 'Create new letterheads' },
  { perm: 'letterheads.update',   desc: 'Edit existing letterheads' },
  { perm: 'letterheads.delete',   desc: 'Delete letterheads' },
  { perm: 'members.read',         desc: 'View organization members list' },
  { perm: 'analytics.read',       desc: 'View analytics dashboard' },
  { perm: 'settings.manage',      desc: 'Access and edit organization preferences' },
]

const allViews = [
  { view: 'invoices',             path: '/embed/invoices',                  perm: 'invoices.read',     desc: 'Invoice list with search and filters' },
  { view: 'invoices/create',      path: '/embed/invoices/create',           perm: 'invoices.create',   desc: 'New invoice form' },
  { view: 'invoices/:id',         path: '/embed/invoices/INV_ID',           perm: 'invoices.read',     desc: 'Single invoice view' },
  { view: 'invoices/:id/edit',    path: '/embed/invoices/INV_ID/edit',      perm: 'invoices.update',   desc: 'Invoice editor' },
  { view: 'projects',             path: '/embed/projects',                  perm: 'projects.read',     desc: 'Project list' },
  { view: 'projects/create',      path: '/embed/projects/create',           perm: 'projects.create',   desc: 'New project form' },
  { view: 'projects/:id',         path: '/embed/projects/PROJ_ID',          perm: 'projects.read',     desc: 'Project detail with linked documents' },
  { view: 'projects/:id/edit',    path: '/embed/projects/PROJ_ID/edit',     perm: 'projects.update',   desc: 'Project editor' },
  { view: 'receipts',             path: '/embed/receipts',                  perm: 'receipts.read',     desc: 'Receipt list' },
  { view: 'receipts/create',      path: '/embed/receipts/create',           perm: 'receipts.create',   desc: 'New receipt form' },
  { view: 'receipts/:id',         path: '/embed/receipts/REC_ID',           perm: 'receipts.read',     desc: 'Single receipt view' },
  { view: 'receipts/:id/edit',    path: '/embed/receipts/REC_ID/edit',      perm: 'receipts.update',   desc: 'Receipt editor' },
  { view: 'clients',              path: '/embed/clients',                   perm: 'clients.read',      desc: 'Client list' },
  { view: 'clients/create',       path: '/embed/clients/create',            perm: 'clients.create',    desc: 'New client form' },
  { view: 'clients/:id',          path: '/embed/clients/CLIENT_ID',         perm: 'clients.read',      desc: 'Client detail' },
  { view: 'clients/:id/edit',     path: '/embed/clients/CLIENT_ID/edit',    perm: 'clients.update',    desc: 'Client editor' },
  { view: 'letterheads',          path: '/embed/letterheads',               perm: 'letterheads.read',  desc: 'Letterhead list' },
  { view: 'letterheads/create',   path: '/embed/letterheads/create',        perm: 'letterheads.create',desc: 'New letterhead form' },
  { view: 'letterheads/:id',      path: '/embed/letterheads/LH_ID',         perm: 'letterheads.read',  desc: 'Letterhead view' },
  { view: 'letterheads/:id/edit', path: '/embed/letterheads/LH_ID/edit',    perm: 'letterheads.update',desc: 'Letterhead editor' },
  { view: 'members',              path: '/embed/members',                   perm: 'members.read',      desc: 'Organization members list' },
  { view: 'analytics',            path: '/embed/analytics',                 perm: 'analytics.read',    desc: 'Analytics dashboard' },
  { view: 'dashboard',            path: '/embed/dashboard',                 perm: '—',                 desc: 'Overview dashboard with recent activity' },
  { view: 'preferences',          path: '/embed/preferences',               perm: 'settings.manage',   desc: 'Organization preferences and settings' },
]

const allEvents = [
  { event: 'invoice.created',     desc: 'A new invoice was successfully created',           payload: '{ id, number, status, to_name, total, currency, created_at }' },
  { event: 'invoice.updated',     desc: 'An invoice was edited and saved',                  payload: '{ id, number, status, to_name, total, currency, updated_at }' },
  { event: 'invoice.deleted',     desc: 'An invoice was deleted',                           payload: '{ id }' },
  { event: 'project.created',     desc: 'A new project was successfully created',           payload: '{ id, name, status, created_at }' },
  { event: 'project.updated',     desc: 'A project was edited and saved',                   payload: '{ id, name, status, updated_at }' },
  { event: 'project.deleted',     desc: 'A project was deleted',                            payload: '{ id }' },
  { event: 'receipt.created',     desc: 'A new receipt was successfully created',           payload: '{ id, number, amount, currency, created_at }' },
  { event: 'receipt.updated',     desc: 'A receipt was edited and saved',                   payload: '{ id, number, amount, currency, updated_at }' },
  { event: 'receipt.deleted',     desc: 'A receipt was deleted',                            payload: '{ id }' },
  { event: 'client.created',      desc: 'A new client was successfully created',            payload: '{ id, name, email, created_at }' },
  { event: 'client.updated',      desc: 'A client record was edited and saved',             payload: '{ id, name, email, updated_at }' },
  { event: 'client.deleted',      desc: 'A client record was deleted',                      payload: '{ id }' },
]

const copiedBlock = ref<string | null>(null)

function copyCode(blockId: string) {
  const block = document.getElementById(blockId)
  const pre = block?.querySelector('pre')
  if (!pre) return
  navigator.clipboard.writeText(pre.textContent?.trim() ?? '')
  copiedBlock.value = blockId
  setTimeout(() => (copiedBlock.value = null), 2000)
}

function scrollTo(id: string) {
  activeSection.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-1000">

    <!-- Header -->
    <header class="border-b border-gray-400/40 bg-gray-100/95 backdrop-blur sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <router-link to="/" class="flex items-center hover:opacity-80 transition-opacity">
            <FlowtaliLogo variant="full" :size="20" />
          </router-link>
          <span class="text-gray-500">/</span>
          <span class="text-gray-900 text-sm">{{ t('docs.breadcrumb') }}</span>
        </div>
        <div class="flex items-center gap-4">
          <LanguageSwitcher />
          <router-link to="/app/dashboard" class="text-xs text-green-700 hover:underline">{{ t('docs.openApp') }}</router-link>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6 flex gap-12 py-12">

      <!-- Sidebar -->
      <aside class="hidden lg:block w-52 flex-shrink-0 sticky top-24 h-fit">
        <p class="text-gray-700 text-xs font-semibold uppercase tracking-widest mb-4">{{ t('docs.onThisPage') }}</p>
        <nav class="flex flex-col gap-1">
          <button v-for="s in sections" :key="s.id" @click="scrollTo(s.id)"
            class="text-left text-sm px-3 py-1.5 rounded-lg transition-colors"
            :class="activeSection === s.id ? 'text-green-700 bg-green-700/8' : 'text-gray-900 hover:text-gray-1000'">
            {{ t('docs.sections.' + s.id) }}
          </button>
        </nav>
      </aside>

      <!-- Content -->
      <main class="flex-1 min-w-0 max-w-3xl">

        <!-- ── Overview ─────────────────────────────────────────────────────── -->
        <section id="overview" class="mb-16 scroll-mt-24">
          <div class="inline-flex items-center gap-2 bg-green-700/10 border border-green-700/20 text-green-700 text-xs font-medium px-3 py-1 rounded-full mb-5">{{ t('docs.overview.badge') }}</div>
          <h1 class="font-sans text-4xl md:text-5xl font-semibold text-gray-1000 mb-4">{{ t('docs.overview.title') }}</h1>
          <p class="text-gray-900 text-lg leading-relaxed mb-6">
            {{ t('docs.overview.intro') }}
          </p>
          <div class="grid sm:grid-cols-3 gap-4 mt-8">
            <div class="bg-gray-200/60 border border-gray-400/40 rounded-xl p-4">
              <div class="text-green-700 text-lg mb-2">⚡</div>
              <div class="text-gray-1000 text-sm font-medium mb-1">{{ t('docs.overview.card1Title') }}</div>
              <div class="text-gray-900 text-xs leading-relaxed">{{ t('docs.overview.card1Desc') }}</div>
            </div>
            <div class="bg-gray-200/60 border border-gray-400/40 rounded-xl p-4">
              <div class="text-green-700 text-lg mb-2">🔐</div>
              <div class="text-gray-1000 text-sm font-medium mb-1">{{ t('docs.overview.card2Title') }}</div>
              <div class="text-gray-900 text-xs leading-relaxed">{{ t('docs.overview.card2Desc') }}</div>
            </div>
            <div class="bg-gray-200/60 border border-gray-400/40 rounded-xl p-4">
              <div class="text-green-700 text-lg mb-2">🎨</div>
              <div class="text-gray-1000 text-sm font-medium mb-1">{{ t('docs.overview.card3Title') }}</div>
              <div class="text-gray-900 text-xs leading-relaxed">{{ t('docs.overview.card3Desc') }}</div>
            </div>
          </div>
        </section>

        <!-- ── Quick start ──────────────────────────────────────────────────── -->
        <section id="quickstart" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-2">{{ t('docs.quickstart.title') }}</h2>
          <p class="text-gray-900 text-sm mb-8">{{ t('docs.quickstart.subtitle') }}</p>

          <!-- Step 1 -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-6 h-6 rounded-full bg-green-700/20 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
              <h3 class="text-gray-1000 font-medium">{{ t('docs.quickstart.step1Title') }}</h3>
            </div>
            <p class="text-gray-900 text-sm ml-9" v-html="t('docs.quickstart.step1Body')"></p>
          </div>

          <!-- Step 2 -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-6 h-6 rounded-full bg-green-700/20 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
              <h3 class="text-gray-1000 font-medium">{{ t('docs.quickstart.step2Title') }}</h3>
            </div>
            <p class="text-gray-900 text-sm ml-9 mb-4" v-html="t('docs.quickstart.step2Body')"></p>

            <div class="ml-9">
              <div id="cb-backend" class="code-block">
                <!-- Tabs -->
                <div class="flex items-center justify-between px-3 pt-2 pb-0 border-b border-gray-400/60">
                  <div class="flex items-center gap-1">
                    <button v-for="t in ([['node','Node.js'],['php','PHP / Laravel'],['go','Go']] as [string,string][])" :key="t[0]"
                      @click="backendTab = t[0]"
                      class="px-3 py-1.5 text-xs rounded-t transition-colors -mb-px border-b-2"
                      :class="backendTab === t[0] ? 'text-green-700 border-green-700' : 'text-gray-700 hover:text-gray-1000 border-transparent'">
                      {{ t[1] }}
                    </button>
                  </div>
                  <button @click="copyCode('cb-backend')" class="copy-btn" title="Copy">
                    <svg v-if="copiedBlock !== 'cb-backend'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
                <!-- Node -->
                <template v-if="backendTab === 'node'">
                <pre v-pre class="code-pre"><code>const res = await fetch(
  'https://flowtali.com/api/v1/orgs/YOUR_ORG_ID/embed/token',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk_live_YOUR_SECRET_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_reference: req.user.id,           // your own user ID (any string)
      permissions: ['invoices.read', 'invoices.create'],
      expires_in: 3600,                      // seconds — max 86400
    }),
  }
)
const { data } = await res.json()
const embedToken = data.token               // send this to your frontend</code></pre>
                </template>
                <!-- PHP -->
                <template v-if="backendTab === 'php'">
                <pre v-pre class="code-pre"><code>use Illuminate\Support\Facades\Http;

$response = Http::withToken(config('services.flowtali.secret_key'))
    ->post("https://flowtali.com/api/v1/orgs/{$orgId}/embed/token", [
        'user_reference' => auth()->id(),
        'permissions'    => ['invoices.read', 'invoices.create'],
        'expires_in'     => 3600,
    ]);

$embedToken = $response->json('data.token');
// Return $embedToken to your frontend (e.g. via a JSON API response)</code></pre>
                </template>
                <!-- Go -->
                <template v-if="backendTab === 'go'">
                <pre v-pre class="code-pre"><code>import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

body, _ := json.Marshal(map[string]any{
    "user_reference": userID,
    "permissions":    []string{"invoices.read", "invoices.create"},
    "expires_in":     3600,
})

req, _ := http.NewRequest(
    "POST",
    fmt.Sprintf("https://flowtali.com/api/v1/orgs/%s/embed/token", orgID),
    bytes.NewBuffer(body),
)
req.Header.Set("Authorization", "Bearer "+os.Getenv("FLOWTALI_SECRET_KEY"))
req.Header.Set("Content-Type", "application/json")

resp, _ := http.DefaultClient.Do(req)
// decode resp.Body → data.token</code></pre>
                </template>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-6 h-6 rounded-full bg-green-700/20 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
              <h3 class="text-gray-1000 font-medium">{{ t('docs.quickstart.step3Title') }}</h3>
            </div>
            <p class="text-gray-900 text-sm ml-9 mb-4">{{ t('docs.quickstart.step3Body') }}</p>

            <div class="ml-9">
              <div id="cb-frontend" class="code-block">
                <div class="flex items-center justify-between px-3 pt-2 pb-0 border-b border-gray-400/60">
                  <div class="flex items-center gap-1">
                    <button v-for="t in ([['html','HTML / JS'],['react','React'],['vue','Vue 3'],['next','Next.js'],['nuxt','Nuxt 3']] as [string,string][])" :key="t[0]"
                      @click="frontendTab = t[0]"
                      class="px-3 py-1.5 text-xs rounded-t transition-colors -mb-px border-b-2"
                      :class="frontendTab === t[0] ? 'text-green-700 border-green-700' : 'text-gray-700 hover:text-gray-1000 border-transparent'">
                      {{ t[1] }}
                    </button>
                  </div>
                  <button @click="copyCode('cb-frontend')" class="copy-btn" title="Copy">
                    <svg v-if="copiedBlock !== 'cb-frontend'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
                <template v-if="frontendTab === 'html'">
                <pre v-pre class="code-pre"><code>&lt;script src="https://flowtali.com/sdk/flowtali.js"&gt;&lt;/script&gt;

&lt;div id="flowtali-embed" style="height:600px"&gt;&lt;/div&gt;

&lt;script&gt;
  const ft = Flowtali.init('pk_live_YOUR_PUBLISHABLE_KEY')

  ft.mount('#flowtali-embed', {
    view: 'invoices',
    token: EMBED_TOKEN_FROM_YOUR_SERVER,
  })
&lt;/script&gt;</code></pre>
                </template>
                <template v-if="frontendTab === 'react'">
                <pre v-pre class="code-pre"><code>import { useEffect, useRef } from 'react'

export default function FlowtaliPanel({ embedToken }) {
  const containerRef = useRef(null)
  const ftRef = useRef(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://flowtali.com/sdk/flowtali.js'
    script.onload = () => {
      ftRef.current = window.Flowtali.init('pk_live_YOUR_PUBLISHABLE_KEY')
      ftRef.current.mount(containerRef.current, {
        view: 'invoices',
        token: embedToken,
      })
    }
    document.head.appendChild(script)
    return () => ftRef.current?.destroy()
  }, [embedToken])

  return &lt;div ref={containerRef} style={{ height: 600 }} /&gt;
}</code></pre>
                </template>
                <template v-if="frontendTab === 'vue'">
                <pre v-pre class="code-pre"><code>&lt;script setup&gt;
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps(['embedToken'])
const container = ref(null)
let ft = null

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://flowtali.com/sdk/flowtali.js'
  script.onload = () => {
    ft = window.Flowtali.init('pk_live_YOUR_PUBLISHABLE_KEY')
    ft.mount(container.value, { view: 'invoices', token: props.embedToken })
  }
  document.head.appendChild(script)
})

onUnmounted(() => ft?.destroy())
&lt;/script&gt;

&lt;template&gt;
  &lt;div ref="container" style="height: 600px" /&gt;
&lt;/template&gt;</code></pre>
                </template>
                <template v-if="frontendTab === 'next'">
                <pre v-pre class="code-pre"><code>'use client'
import { useEffect, useRef } from 'react'
import Script from 'next/script'

export default function FlowtaliPanel({ embedToken }) {
  const containerRef = useRef(null)
  const ftRef = useRef(null)

  function onSDKLoad() {
    ftRef.current = window.Flowtali.init('pk_live_YOUR_PUBLISHABLE_KEY')
    ftRef.current.mount(containerRef.current, {
      view: 'invoices',
      token: embedToken,
    })
  }

  useEffect(() => () => ftRef.current?.destroy(), [])

  return (
    &lt;&gt;
      &lt;Script src="https://flowtali.com/sdk/flowtali.js" onLoad={onSDKLoad} /&gt;
      &lt;div ref={containerRef} style={{ height: 600 }} /&gt;
    &lt;/&gt;
  )
}</code></pre>
                </template>
                <template v-if="frontendTab === 'nuxt'">
                <pre v-pre class="code-pre"><code>&lt;script setup&gt;
const props = defineProps(['embedToken'])
const container = ref(null)
let ft = null

onMounted(async () => {
  await new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://flowtali.com/sdk/flowtali.js'
    s.onload = resolve
    document.head.appendChild(s)
  })
  ft = window.Flowtali.init('pk_live_YOUR_PUBLISHABLE_KEY')
  ft.mount(container.value, { view: 'invoices', token: props.embedToken })
})

onUnmounted(() => ft?.destroy())
&lt;/script&gt;

&lt;template&gt;
  &lt;div ref="container" style="height: 600px" /&gt;
&lt;/template&gt;</code></pre>
                </template>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Authentication ───────────────────────────────────────────────── -->
        <section id="auth" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-2">{{ t('docs.auth.title') }}</h2>
          <p class="text-gray-900 text-sm mb-6">{{ t('docs.auth.subtitle') }}</p>

          <div class="bg-gray-200/50 border border-gray-400/40 rounded-xl p-5 mb-6">
            <div class="grid sm:grid-cols-2 gap-6">
              <div>
                <div class="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">{{ t('docs.auth.pubKeyLabel') }} <code class="ci">pk_live_</code></div>
                <p class="text-gray-900 text-sm leading-relaxed" v-html="t('docs.auth.pubKeyDesc')"></p>
              </div>
              <div>
                <div class="text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-2">{{ t('docs.auth.secretKeyLabel') }} <code class="ci">sk_live_</code></div>
                <p class="text-gray-900 text-sm leading-relaxed">{{ t('docs.auth.secretKeyDescPre') }} <code class="ci">POST /orgs/{org}/embed/token</code> {{ t('docs.auth.secretKeyDescPost') }}</p>
              </div>
            </div>
          </div>

          <div class="bg-green-700/5 border border-green-700/20 rounded-xl px-4 py-3 flex gap-3 text-sm">
            <svg class="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/></svg>
            <span class="text-gray-900" v-html="t('docs.auth.rateLimit')"></span>
          </div>
        </section>

        <!-- ── Permissions ──────────────────────────────────────────────────── -->
        <section id="permissions" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-2">{{ t('docs.permissions.title') }}</h2>
          <p class="text-gray-900 text-sm mb-4" v-html="t('docs.permissions.intro')"></p>

          <div class="bg-gray-200/50 border border-gray-400/40 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-400/40">
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider w-56">{{ t('docs.permissions.thPermission') }}</th>
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider">{{ t('docs.permissions.thAllows') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-400/20">
                <tr v-for="p in allPermissions" :key="p.perm">
                  <td class="px-4 py-2.5"><code class="ci">{{ p.perm }}</code></td>
                  <td class="px-4 py-2.5 text-gray-900">{{ permDescs[p.perm] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Available views ─────────────────────────────────────────────── -->
        <section id="views" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-2">{{ t('docs.views.title') }}</h2>
          <p class="text-gray-900 text-sm mb-4" v-html="t('docs.views.intro')"></p>

          <div id="cb-views" class="code-block mb-5">
            <div class="code-lang-row"><span>{{ t('docs.views.exampleLabel') }}</span><button @click="copyCode('cb-views')" class="copy-btn" title="Copy"><svg v-if="copiedBlock !== 'cb-views'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button></div>
            <pre v-pre class="code-pre"><code>// Static view
ft.mount('#container', { view: 'invoices', token })

// View with an ID — pass the id as a param or embed the path directly
ft.mount('#container', { view: 'invoices/INV_ID', token })
ft.mount('#container', { view: 'projects/PROJ_ID/edit', token })</code></pre>
          </div>

          <div class="bg-gray-200/50 border border-gray-400/40 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-400/40">
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider">{{ t('docs.views.thView') }}</th>
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider hidden sm:table-cell">{{ t('docs.views.thPermission') }}</th>
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider hidden md:table-cell">{{ t('docs.views.thDescription') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-400/20">
                <tr v-for="v in allViews" :key="v.view">
                  <td class="px-4 py-2.5"><code class="ci text-xs">{{ v.view }}</code></td>
                  <td class="px-4 py-2.5 hidden sm:table-cell"><code class="ci text-xs">{{ v.perm }}</code></td>
                  <td class="px-4 py-2.5 text-gray-900 text-xs hidden md:table-cell">{{ viewDescs[v.view] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Appearance ──────────────────────────────────────────────────── -->
        <section id="appearance" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-2">{{ t('docs.appearance.title') }}</h2>
          <p class="text-gray-900 text-sm mb-6" v-html="t('docs.appearance.intro')"></p>

          <div id="cb-appear-global" class="code-block mb-4">
            <div class="code-lang-row"><span>{{ t('docs.appearance.globalLabel') }}</span><button @click="copyCode('cb-appear-global')" class="copy-btn" title="Copy"><svg v-if="copiedBlock !== 'cb-appear-global'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button></div>
            <pre v-pre class="code-pre"><code>const ft = Flowtali.init('pk_live_...', {
  appearance: {
    primaryColor:    '#6366f1',       // buttons, links, focus rings (default: #00c853)
    backgroundColor: '#ffffff',       // iframe background          (default: #000000)
    textColor:       '#111827',       // primary body text           (default: #ededed)
    fontFamily:      'Inter, sans-serif', //                        (default: Geist Sans)
    borderRadius:    '8px',           // inputs and cards            (default: 7px)
  },
})</code></pre>
          </div>

          <div id="cb-appear-mount" class="code-block">
            <div class="code-lang-row"><span>{{ t('docs.appearance.mountLabel') }}</span><button @click="copyCode('cb-appear-mount')" class="copy-btn" title="Copy"><svg v-if="copiedBlock !== 'cb-appear-mount'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button></div>
            <pre v-pre class="code-pre"><code>ft.mount('#container', {
  view: 'invoices',
  token: embedToken,
  appearance: { primaryColor: '#10b981' },  // overrides the init appearance
})</code></pre>
          </div>
        </section>

        <!-- ── Events ──────────────────────────────────────────────────────── -->
        <section id="events" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-2">{{ t('docs.events.title') }}</h2>
          <p class="text-gray-900 text-sm mb-6" v-html="t('docs.events.intro')"></p>

          <!-- Full event reference -->
          <h3 class="text-gray-1000 font-medium text-sm mb-3">{{ t('docs.events.allHeading') }}</h3>
          <div class="bg-gray-200/50 border border-gray-400/40 rounded-xl overflow-hidden mb-8">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-400/40">
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider w-48">{{ t('docs.events.thEvent') }}</th>
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider hidden sm:table-cell">{{ t('docs.events.thFiredWhen') }}</th>
                  <th class="text-left px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wider hidden lg:table-cell">{{ t('docs.events.thPayload') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-400/20">
                <tr v-for="e in allEvents" :key="e.event">
                  <td class="px-4 py-2.5"><code class="ci text-xs">{{ e.event }}</code></td>
                  <td class="px-4 py-2.5 text-gray-900 text-xs hidden sm:table-cell">{{ eventDescs[e.event] }}</td>
                  <td class="px-4 py-2.5 hidden lg:table-cell"><code class="ci text-xs">{{ e.payload }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Framework examples -->
          <h3 class="text-gray-1000 font-medium text-sm mb-4">{{ t('docs.events.frameworkHeading') }}</h3>
          <div id="cb-events" class="code-block">
            <div class="flex items-center justify-between px-3 pt-2 pb-0 border-b border-gray-400/60">
              <div class="flex items-center gap-1">
                <button v-for="t in ([['js','JS / HTML'],['react','React'],['vue','Vue 3'],['next','Next.js'],['nuxt','Nuxt 3']] as [string,string][])" :key="t[0]"
                  @click="eventsTab = t[0]"
                  class="px-3 py-1.5 text-xs rounded-t transition-colors -mb-px border-b-2"
                  :class="eventsTab === t[0] ? 'text-green-700 border-green-700' : 'text-gray-700 hover:text-gray-1000 border-transparent'">
                  {{ t[1] }}
                </button>
              </div>
              <button @click="copyCode('cb-events')" class="copy-btn" title="Copy">
                <svg v-if="copiedBlock !== 'cb-events'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
            <template v-if="eventsTab === 'js'">
                <pre v-pre class="code-pre"><code>const ft = Flowtali.init('pk_live_...')
ft.mount('#container', { view: 'invoices', token })

ft.on('invoice.created', (invoice) => {
  console.log('Invoice created:', invoice.id)
  showToast('Invoice created!')
})

ft.on('invoice.deleted', ({ id }) => {
  removeFromLocalList(id)
})

// Catch every event from this embed
ft.on('*', (eventName, data) => {
  console.log('[flowtali]', eventName, data)
})</code></pre>
                </template>
            <template v-if="eventsTab === 'react'">
                <pre v-pre class="code-pre"><code>import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function FlowtaliPanel({ embedToken }) {
  const containerRef = useRef(null)
  const ftRef = useRef(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://flowtali.com/sdk/flowtali.js'
    script.onload = () => {
      ftRef.current = window.Flowtali.init('pk_live_...')
      ftRef.current.mount(containerRef.current, { view: 'invoices', token: embedToken })

      ftRef.current.on('invoice.created', () => {
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
      })
      ftRef.current.on('invoice.updated', (invoice) => {
        queryClient.setQueryData(['invoices', invoice.id], invoice)
      })
      ftRef.current.on('invoice.deleted', ({ id }) => {
        queryClient.removeQueries({ queryKey: ['invoices', id] })
      })
    }
    document.head.appendChild(script)
    return () => ftRef.current?.destroy()
  }, [embedToken])

  return &lt;div ref={containerRef} style={{ height: 600 }} /&gt;
}</code></pre>
                </template>
            <template v-if="eventsTab === 'vue'">
                <pre v-pre class="code-pre"><code>&lt;script setup&gt;
const props = defineProps(['embedToken'])
const emit = defineEmits(['invoiceCreated', 'invoiceDeleted'])
const container = ref(null)
let ft = null

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://flowtali.com/sdk/flowtali.js'
  script.onload = () => {
    ft = window.Flowtali.init('pk_live_...')
    ft.mount(container.value, { view: 'invoices', token: props.embedToken })

    ft.on('invoice.created', (invoice) => emit('invoiceCreated', invoice))
    ft.on('invoice.deleted', ({ id }) => emit('invoiceDeleted', id))
    ft.on('receipt.created', (receipt) => { /* update local state */ })
  }
  document.head.appendChild(script)
})
onUnmounted(() => ft?.destroy())
&lt;/script&gt;

&lt;template&gt;&lt;div ref="container" style="height:600px"/&gt;&lt;/template&gt;</code></pre>
                </template>
            <template v-if="eventsTab === 'next'">
                <pre v-pre class="code-pre"><code>'use client'
import { useEffect, useRef } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

export default function FlowtaliPanel({ embedToken }) {
  const containerRef = useRef(null)
  const ftRef = useRef(null)
  const router = useRouter()

  function onSDKLoad() {
    ftRef.current = window.Flowtali.init('pk_live_...')
    ftRef.current.mount(containerRef.current, { view: 'invoices', token: embedToken })

    // Refresh server components after any mutation
    ftRef.current.on('invoice.created', () => router.refresh())
    ftRef.current.on('invoice.updated', () => router.refresh())
    ftRef.current.on('project.created', () => router.refresh())
    ftRef.current.on('receipt.created', () => router.refresh())
  }

  useEffect(() => () => ftRef.current?.destroy(), [])

  return (
    &lt;&gt;
      &lt;Script src="https://flowtali.com/sdk/flowtali.js" onLoad={onSDKLoad} /&gt;
      &lt;div ref={containerRef} style={{ height: 600 }} /&gt;
    &lt;/&gt;
  )
}</code></pre>
                </template>
            <template v-if="eventsTab === 'nuxt'">
                <pre v-pre class="code-pre"><code>&lt;script setup&gt;
const props = defineProps(['embedToken'])
const container = ref(null)
let ft = null

onMounted(async () => {
  await new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://flowtali.com/sdk/flowtali.js'
    s.onload = resolve
    document.head.appendChild(s)
  })

  ft = window.Flowtali.init('pk_live_...')
  ft.mount(container.value, { view: 'invoices', token: props.embedToken })

  ft.on('invoice.created', async () => await refreshNuxtData('invoices'))
  ft.on('client.created',  async () => await refreshNuxtData('clients'))
  ft.on('project.created', async () => await refreshNuxtData('projects'))
})

onUnmounted(() => ft?.destroy())
&lt;/script&gt;

&lt;template&gt;&lt;div ref="container" style="height:600px"/&gt;&lt;/template&gt;</code></pre>
                </template>
          </div>
        </section>

        <!-- ── SDK reference ───────────────────────────────────────────────── -->
        <section id="reference" class="mb-16 scroll-mt-24">
          <h2 class="font-sans text-3xl font-semibold text-gray-1000 mb-6">{{ t('docs.reference.title') }}</h2>

          <div class="flex flex-col gap-7">
            <div class="border border-gray-400/40 rounded-xl p-5">
              <h3 class="font-mono text-sm text-gray-1000 font-semibold mb-1">Flowtali.init(publishableKey, options?)</h3>
              <p class="text-gray-900 text-xs mb-3" v-html="t('docs.reference.initDesc')"></p>
              <table class="w-full text-xs"><thead><tr class="border-b border-gray-400/30"><th class="text-left py-1.5 pr-3 text-gray-700 uppercase tracking-wider">{{ t('docs.reference.thOption') }}</th><th class="text-left py-1.5 pr-3 text-gray-700 uppercase tracking-wider">{{ t('docs.reference.thType') }}</th><th class="text-left py-1.5 text-gray-700 uppercase tracking-wider">{{ t('docs.reference.thDescription') }}</th></tr></thead>
              <tbody class="divide-y divide-gray-400/20">
                <tr><td class="py-1.5 pr-3"><code class="ci">appearance</code></td><td class="py-1.5 pr-3 text-gray-900">object</td><td class="py-1.5 text-gray-900">{{ t('docs.reference.initAppearanceDesc') }}</td></tr>
              </tbody></table>
            </div>

            <div class="border border-gray-400/40 rounded-xl p-5">
              <h3 class="font-mono text-sm text-gray-1000 font-semibold mb-1">ft.mount(selector, options)</h3>
              <p class="text-gray-900 text-xs mb-3" v-html="t('docs.reference.mountDesc')"></p>
              <table class="w-full text-xs"><thead><tr class="border-b border-gray-400/30"><th class="text-left py-1.5 pr-3 text-gray-700 uppercase tracking-wider">{{ t('docs.reference.thOption') }}</th><th class="text-left py-1.5 pr-3 text-gray-700 uppercase tracking-wider">{{ t('docs.reference.thType') }}</th><th class="text-left py-1.5 text-gray-700 uppercase tracking-wider">{{ t('docs.reference.thDescription') }}</th></tr></thead>
              <tbody class="divide-y divide-gray-400/20">
                <tr><td class="py-1.5 pr-3"><code class="ci">view</code></td><td class="py-1.5 pr-3 text-gray-900">string</td><td class="py-1.5 text-gray-900">{{ t('docs.reference.mountViewDesc') }}</td></tr>
                <tr><td class="py-1.5 pr-3"><code class="ci">token</code></td><td class="py-1.5 pr-3 text-gray-900">string</td><td class="py-1.5 text-gray-900">{{ t('docs.reference.mountTokenDesc') }}</td></tr>
                <tr><td class="py-1.5 pr-3"><code class="ci">params</code></td><td class="py-1.5 pr-3 text-gray-900">object</td><td class="py-1.5 text-gray-900">{{ t('docs.reference.mountParamsDesc') }} <code class="ci">{ filter: 'unpaid' }</code>.</td></tr>
                <tr><td class="py-1.5 pr-3"><code class="ci">appearance</code></td><td class="py-1.5 pr-3 text-gray-900">object</td><td class="py-1.5 text-gray-900">{{ t('docs.reference.mountAppearanceDesc') }}</td></tr>
              </tbody></table>
            </div>

            <div class="border border-gray-400/40 rounded-xl p-5">
              <h3 class="font-mono text-sm text-gray-1000 font-semibold mb-1">ft.open(options)</h3>
              <p class="text-gray-900 text-xs" v-html="t('docs.reference.openDesc')"></p>
            </div>

            <div class="border border-gray-400/40 rounded-xl p-5">
              <h3 class="font-mono text-sm text-gray-1000 font-semibold mb-1">ft.on(event, handler) / ft.off(event, handler)</h3>
              <p class="text-gray-900 text-xs" v-html="t('docs.reference.onDesc')"></p>
            </div>

            <div class="border border-gray-400/40 rounded-xl p-5">
              <h3 class="font-mono text-sm text-gray-1000 font-semibold mb-1">ft.destroy()</h3>
              <p class="text-gray-900 text-xs">{{ t('docs.reference.destroyDesc') }}</p>
            </div>

            <div class="border border-gray-400/40 rounded-xl p-5">
              <h3 class="font-mono text-sm text-gray-1000 font-semibold mb-1">Flowtali.config({ baseUrl })</h3>
              <p class="text-gray-900 text-xs" v-html="t('docs.reference.configDesc')"></p>
            </div>
          </div>
        </section>

      </main>
    </div>

    <!-- Copy toast -->
    <Transition name="toast">
      <div v-if="copiedBlock" class="copy-toast">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {{ t('docs.copiedToast') }}
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.code-block {
  background: #0e0e10;
  border: 1px solid #2e2e2e;
  border-radius: 10px;
  overflow: hidden;
  font-family: var(--font-mono);
}
.code-lang {
  background: #1a1a1a;
  border-bottom: 1px solid #2e2e2e;
  padding: 6px 14px;
  font-size: 11px;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.code-lang-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a1a;
  border-bottom: 1px solid #2e2e2e;
  padding: 5px 10px 5px 14px;
  font-size: 11px;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  border-radius: 5px;
  color: #a0a0a0;
  transition: background 0.15s, color 0.15s;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}
.copy-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #ededed;
}
.copy-toast {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #292929;
  border: 1px solid #2e2e2e;
  color: #ededed;
  font-size: 13px;
  font-family: var(--font-sans);
  padding: 10px 16px;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  pointer-events: none;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.code-pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.7;
  color: #d4cfc8;
}
.ci {
  background: rgba(0,200,83,0.1);
  border: 1px solid rgba(0,200,83,0.15);
  color: #00c853;
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 1px 5px;
  border-radius: 4px;
}
</style>
