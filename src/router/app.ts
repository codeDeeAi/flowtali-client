import { layouts } from '@/types/layout'

const meta = { layout: layouts.App, requiresAuth: true }

// Shorthand helpers
const p  = (permission: string) => ({ ...meta, permission })
const bo = (permission?: string) => ({ ...meta, requiresBusinessOrg: true, ...(permission ? { permission } : {}) })

export const appRoutes = [
  {
    path: '/app',
    meta,
    children: [
      { path: 'dashboard',        name: 'dashboard',        component: () => import('@/views/dashboard/DashboardView.vue'),             meta },
      { path: 'ai',               name: 'ai',               component: () => import('@/views/ai/AiAgentView.vue'),                      meta },

      { path: 'projects',              name: 'projects',        component: () => import('@/views/projects/ProjectsView.vue'),        meta: bo('projects.read') },
      { path: 'projects/create',       name: 'projects.create', component: () => import('@/views/projects/ProjectCreatePage.vue'),   meta: bo('projects.create') },
      { path: 'projects/:id',          name: 'projects.view',   component: () => import('@/views/projects/ProjectViewPage.vue'),     meta: bo('projects.read') },
      { path: 'projects/:id/edit',     name: 'projects.edit',   component: () => import('@/views/projects/ProjectEditPage.vue'),     meta: bo('projects.update') },

      { path: 'invoices',              name: 'invoices',        component: () => import('@/views/invoices/InvoicesView.vue'),        meta: p('invoices.read') },
      { path: 'invoices/create',       name: 'invoices.create', component: () => import('@/views/invoices/InvoiceCreatePage.vue'),   meta: p('invoices.create') },
      { path: 'invoices/:id',          name: 'invoices.view',   component: () => import('@/views/invoices/InvoiceViewPage.vue'),     meta: p('invoices.read') },
      { path: 'invoices/:id/edit',     name: 'invoices.edit',   component: () => import('@/views/invoices/InvoiceEditPage.vue'),     meta: p('invoices.update') },

      { path: 'receipts',              name: 'receipts',        component: () => import('@/views/receipts/ReceiptsView.vue'),       meta: p('receipts.read') },
      { path: 'receipts/create',       name: 'receipts.create', component: () => import('@/views/receipts/ReceiptCreatePage.vue'),  meta: p('receipts.create') },
      { path: 'receipts/:id',          name: 'receipts.view',   component: () => import('@/views/receipts/ReceiptViewPage.vue'),    meta: p('receipts.read') },
      { path: 'receipts/:id/edit',     name: 'receipts.edit',   component: () => import('@/views/receipts/ReceiptEditPage.vue'),    meta: p('receipts.update') },

      { path: 'letterheads',           name: 'letterheads',        component: () => import('@/views/letterheads/LetterheadsView.vue'),       meta: p('letterheads.read') },
      { path: 'letterheads/create',    name: 'letterheads.create', component: () => import('@/views/letterheads/LetterheadCreatePage.vue'),  meta: p('letterheads.create') },
      { path: 'letterheads/:id',       name: 'letterheads.view',   component: () => import('@/views/letterheads/LetterheadViewPage.vue'),    meta: p('letterheads.read') },
      { path: 'letterheads/:id/edit',  name: 'letterheads.edit',   component: () => import('@/views/letterheads/LetterheadEditPage.vue'),    meta: p('letterheads.update') },

      { path: 'clients',          name: 'clients',          component: () => import('@/views/clients/ClientsView.vue'),       meta: p('clients.read') },
      { path: 'clients/create',   name: 'clients.create',   component: () => import('@/views/clients/ClientCreatePage.vue'),  meta: p('clients.create') },
      { path: 'clients/:id',      name: 'clients.view',     component: () => import('@/views/clients/ClientViewPage.vue'),    meta: p('clients.read') },
      { path: 'clients/:id/edit', name: 'clients.edit',     component: () => import('@/views/clients/ClientEditPage.vue'),    meta: p('clients.update') },

      { path: 'members',          name: 'members',          component: () => import('@/views/members/MembersView.vue'),       meta: bo('members.read') },
      { path: 'members/:id',      name: 'members.view',     component: () => import('@/views/members/MemberViewPage.vue'),    meta: bo('members.read') },

      { path: 'roles',            name: 'roles',            component: () => import('@/views/roles/RolesView.vue'),            meta: bo('roles.read') },

      { path: 'org-preferences',  name: 'org-preferences',  component: () => import('@/views/org-preferences/OrgPreferencesView.vue'), meta },
      { path: 'audit-logs',       name: 'audit-logs',       component: () => import('@/views/audit-logs/AuditLogsView.vue'),           meta },
      { path: 'analytics',        name: 'analytics',        component: () => import('@/views/analytics/AnalyticsView.vue'),             meta: p('analytics.read') },
      { path: 'billing',          name: 'billing',          component: () => import('@/views/billing/BillingPage.vue'),                meta },
      { path: 'subscription',     redirect: { name: 'billing' } },
      { path: 'settings',         name: 'settings',         component: () => import('@/views/settings/SettingsView.vue'),               meta: p('settings.read') },
      { path: 'profile',          name: 'profile',          component: () => import('@/views/profile/ProfileView.vue'),                 meta },
    ],
  },
]
