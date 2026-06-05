import { layouts } from '@/types/layout'

const meta = { layout: layouts.Embed, embed: true }

export const embedRoutes = [
  {
    path: '/embed',
    meta,
    children: [
      // ── Invoices ────────────────────────────────────────────────────────────
      { path: 'invoices',              name: 'embed.invoices',        component: () => import('@/views/invoices/InvoicesView.vue'),           meta },
      { path: 'invoices/create',       name: 'embed.invoices.create', component: () => import('@/views/invoices/InvoiceCreatePage.vue'),      meta },
      { path: 'invoices/:id',          name: 'embed.invoices.view',   component: () => import('@/views/invoices/InvoiceViewPage.vue'),        meta },
      { path: 'invoices/:id/edit',     name: 'embed.invoices.edit',   component: () => import('@/views/invoices/InvoiceEditPage.vue'),        meta },

      // ── Projects ────────────────────────────────────────────────────────────
      { path: 'projects',              name: 'embed.projects',        component: () => import('@/views/projects/ProjectsView.vue'),           meta },
      { path: 'projects/create',       name: 'embed.projects.create', component: () => import('@/views/projects/ProjectCreatePage.vue'),      meta },
      { path: 'projects/:id',          name: 'embed.projects.view',   component: () => import('@/views/projects/ProjectViewPage.vue'),        meta },
      { path: 'projects/:id/edit',     name: 'embed.projects.edit',   component: () => import('@/views/projects/ProjectEditPage.vue'),        meta },

      // ── Receipts ────────────────────────────────────────────────────────────
      { path: 'receipts',              name: 'embed.receipts',        component: () => import('@/views/receipts/ReceiptsView.vue'),           meta },
      { path: 'receipts/create',       name: 'embed.receipts.create', component: () => import('@/views/receipts/ReceiptCreatePage.vue'),      meta },
      { path: 'receipts/:id',          name: 'embed.receipts.view',   component: () => import('@/views/receipts/ReceiptViewPage.vue'),        meta },
      { path: 'receipts/:id/edit',     name: 'embed.receipts.edit',   component: () => import('@/views/receipts/ReceiptEditPage.vue'),        meta },

      // ── Clients ─────────────────────────────────────────────────────────────
      { path: 'clients',               name: 'embed.clients',         component: () => import('@/views/clients/ClientsView.vue'),             meta },
      { path: 'clients/create',        name: 'embed.clients.create',  component: () => import('@/views/clients/ClientCreatePage.vue'),        meta },
      { path: 'clients/:id',           name: 'embed.clients.view',    component: () => import('@/views/clients/ClientViewPage.vue'),          meta },
      { path: 'clients/:id/edit',      name: 'embed.clients.edit',    component: () => import('@/views/clients/ClientEditPage.vue'),          meta },

      // ── Letterheads ─────────────────────────────────────────────────────────
      { path: 'letterheads',           name: 'embed.letterheads',        component: () => import('@/views/letterheads/LetterheadsView.vue'),      meta },
      { path: 'letterheads/create',    name: 'embed.letterheads.create', component: () => import('@/views/letterheads/LetterheadCreatePage.vue'), meta },
      { path: 'letterheads/:id',       name: 'embed.letterheads.view',   component: () => import('@/views/letterheads/LetterheadViewPage.vue'),   meta },
      { path: 'letterheads/:id/edit',  name: 'embed.letterheads.edit',   component: () => import('@/views/letterheads/LetterheadEditPage.vue'),   meta },

      // ── Preferences ─────────────────────────────────────────────────────────
      { path: 'preferences',           name: 'embed.preferences',     component: () => import('@/views/org-preferences/OrgPreferencesView.vue'), meta },

      // ── Dashboard / Analytics ───────────────────────────────────────────────
      { path: 'dashboard',             name: 'embed.dashboard',       component: () => import('@/views/dashboard/DashboardView.vue'),            meta },
      { path: 'analytics',             name: 'embed.analytics',       component: () => import('@/views/analytics/AnalyticsView.vue'),            meta },

      // ── Members ─────────────────────────────────────────────────────────────
      { path: 'members',               name: 'embed.members',         component: () => import('@/views/members/MembersView.vue'),                meta },

      // ── Error ────────────────────────────────────────────────────────────────
      { path: 'error',                 name: 'embed.error',           component: () => import('@/views/embed/EmbedErrorView.vue'),               meta },
    ],
  },
]
