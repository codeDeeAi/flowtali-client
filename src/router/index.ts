import { appRoutes } from './app'
import { embedRoutes } from './embed'
import { authRoutes } from '@/router/auth'
import Homepage from '@/views/home/HomeView.vue'
import { layouts, type TLayout } from '@/types/layout'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEmbedAuthStore } from '@/stores/embedAuth'
import embedHttp from '@/services/utils/embedHttp'

const publicShareRoutes = [
  {
    path: '/share/i/:token',
    name: 'share.invoice',
    component: () => import('@/views/public/PublicInvoiceView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/share/l/:token',
    name: 'share.letterhead',
    component: () => import('@/views/public/PublicLetterheadView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/share/r/:token',
    name: 'share.receipt',
    component: () => import('@/views/public/PublicReceiptView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/legal/PrivacyPolicyView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/legal/TermsOfServiceView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/legal/AboutView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/legal/ContactView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/docs/embed',
    name: 'docs.embed',
    component: () => import('@/views/docs/EmbedDocsView.vue'),
    meta: { layout: layouts.Public },
  },
  {
    path: '/changelog',
    name: 'changelog',
    component: () => import('@/views/legal/ChangelogView.vue'),
    meta: { layout: layouts.Public },
  },
]

declare module 'vue-router' {
  interface RouteMeta {
    layout?: TLayout
    requiresAuth?: boolean
    permission?: string          // must have this permission in current org
    requiresBusinessOrg?: boolean // must be a business org
    embed?: boolean               // running inside the embed SDK
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Homepage,
      meta: { layout: layouts.Default },
    },
    ...authRoutes,
    ...appRoutes,
    ...embedRoutes,
    ...publicShareRoutes,
    {
      path: '/invitations/accept',
      name: 'invitations.accept',
      component: () => import('@/views/invitations/InviteAcceptPage.vue'),
      meta: { layout: layouts.Public },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/errors/NotFoundView.vue'),
    },
  ],
})

// Embed guard — runs before the regular auth guard
router.beforeEach(async (to) => {
  if (!to.meta.embed) return // skip for non-embed routes

  const embedStore = useEmbedAuthStore()

  // Already initialised in this session — let through
  if (embedStore.isAuthenticated) return

  const rawToken = to.query.token as string | undefined

  if (!rawToken) {
    return { name: 'embed.error', query: { message: 'No embed token provided.' } }
  }

  try {
    const res = await embedHttp.post(
      '/api/v1/embed/verify',
      {},
      { headers: { 'X-Embed-Token': rawToken } },
    )
    const session = res.data.data
    embedStore.init({ token: rawToken, ...session })
  } catch {
    return { name: 'embed.error', query: { message: 'Invalid or expired embed token.' } }
  }
})

const guestOnlyRoutes = new Set([
  'signin',
  'signup',
  'forgot-password',
  'auth.reset-password',
  'auth.mfa-verify',
  'auth.mfa-setup',
  'auth.magic-login',
  'auth.magic-login.verify',
  'auth.google-callback',
])

router.beforeEach((to) => {
  const authStore  = useAuthStore()
  const isLoggedIn = authStore.isLoggedIn

  // Redirect authenticated users away from guest-only pages
  if (isLoggedIn && guestOnlyRoutes.has(to.name as string)) {
    return { name: 'dashboard' }
  }

  // Redirect unauthenticated users away from protected pages
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'signin', query: { redirect: to.fullPath } }
  }

  if (!isLoggedIn) return // No org checks needed for public routes

  const org = authStore.getCurrentOrganization

  // Block personal orgs from business-only pages
  if (to.meta.requiresBusinessOrg && org?.type !== 'business') {
    return { name: 'dashboard' }
  }

  // Block users who lack the required permission
  if (to.meta.permission && org) {
    const hasPermission = (org.permissions ?? []).includes(to.meta.permission)
    if (!hasPermission) {
      return { name: 'dashboard' }
    }
  }
})

export default router
