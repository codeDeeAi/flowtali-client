import { layouts } from '@/types/layout'

const meta = { layout: layouts.App, requiresAuth: true }

export const appRoutes = [
  {
    path: '/app',
    meta,
    children: [
      { path: 'dashboard',        name: 'dashboard',        component: () => import('@/views/dashboard/DashboardView.vue'),             meta },
      { path: 'invoices',              name: 'invoices',        component: () => import('@/views/invoices/InvoicesView.vue'),        meta },
      { path: 'invoices/create',       name: 'invoices.create', component: () => import('@/views/invoices/InvoiceCreatePage.vue'),   meta },
      { path: 'invoices/:id',          name: 'invoices.view',   component: () => import('@/views/invoices/InvoiceViewPage.vue'),     meta },
      { path: 'invoices/:id/edit',     name: 'invoices.edit',   component: () => import('@/views/invoices/InvoiceEditPage.vue'),     meta },
      { path: 'letterheads',           name: 'letterheads',        component: () => import('@/views/letterheads/LetterheadsView.vue'),       meta },
      { path: 'letterheads/create',    name: 'letterheads.create', component: () => import('@/views/letterheads/LetterheadCreatePage.vue'),  meta },
      { path: 'letterheads/:id',       name: 'letterheads.view',   component: () => import('@/views/letterheads/LetterheadViewPage.vue'),    meta },
      { path: 'letterheads/:id/edit',  name: 'letterheads.edit',   component: () => import('@/views/letterheads/LetterheadEditPage.vue'),    meta },
      { path: 'clients',          name: 'clients',          component: () => import('@/views/clients/ClientsView.vue'),                 meta },
      { path: 'clients/create',   name: 'clients.create',   component: () => import('@/views/clients/ClientCreatePage.vue'),             meta },
      { path: 'clients/:id',      name: 'clients.view',     component: () => import('@/views/clients/ClientViewPage.vue'),               meta },
      { path: 'clients/:id/edit', name: 'clients.edit',     component: () => import('@/views/clients/ClientEditPage.vue'),               meta },
      { path: 'members',          name: 'members',          component: () => import('@/views/members/MembersView.vue'),                 meta },
      { path: 'members/:id',      name: 'members.view',     component: () => import('@/views/members/MemberViewPage.vue'),               meta },
      { path: 'roles',            name: 'roles',            component: () => import('@/views/roles/RolesView.vue'),                     meta },
      { path: 'org-preferences',  name: 'org-preferences',  component: () => import('@/views/org-preferences/OrgPreferencesView.vue'), meta },
      { path: 'audit-logs',       name: 'audit-logs',       component: () => import('@/views/audit-logs/AuditLogsView.vue'),           meta },
      { path: 'analytics',        name: 'analytics',        component: () => import('@/views/analytics/AnalyticsView.vue'),             meta },
      { path: 'subscription',     name: 'subscription',     component: () => import('@/views/subscription/SubscriptionView.vue'),       meta },
      { path: 'settings',         name: 'settings',         component: () => import('@/views/settings/SettingsView.vue'),               meta },
      { path: 'profile',          name: 'profile',          component: () => import('@/views/profile/ProfileView.vue'),                 meta },
    ],
  },
]
