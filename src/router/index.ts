import { appRoutes } from './app'
import { authRoutes } from '@/router/auth'
import Homepage from '@/views/home/HomeView.vue'
import { layouts, type TLayout } from '@/types/layout'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
]

declare module 'vue-router' {
  interface RouteMeta {
    layout?: TLayout
    requiresAuth?: boolean
    permission?: string          // must have this permission in current org
    requiresBusinessOrg?: boolean // must be a business org
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
    ...publicShareRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/errors/NotFoundView.vue'),
    },
  ],
})

const guestOnlyRoutes = new Set([
  'signin',
  'signup',
  'forgot-password',
  'auth.reset-password',
  'auth.mfa-verify',
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
