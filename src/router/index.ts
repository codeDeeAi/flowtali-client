import { appRoutes } from './app'
import { embedRoutes } from './embed'
import { authRoutes } from '@/router/auth'
import Homepage from '@/views/home/HomeView.vue'
import { layouts, type TLayout } from '@/types/layout'
import { createRouter, createWebHistory, START_LOCATION, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEmbedAuthStore } from '@/stores/embedAuth'
import { useLocaleStore } from '@/stores/locale'
import { DEFAULT_LOCALE, isSupportedLocale, PREFIXED_LOCALES } from '@/i18n'
import embedHttp from '@/services/utils/embedHttp'

// Public/landing routes carry an optional locale prefix (/de/…, /cs/…, /fr/…);
// English stays bare (/…). One record per route handles both via an optional
// param constrained to the non-default locales.
const LOCALE_SEGMENT = `:locale(${PREFIXED_LOCALES.join('|')})?`

function localizePath(path: string): string {
  return path === '/' ? `/${LOCALE_SEGMENT}` : `/${LOCALE_SEGMENT}${path}`
}

/** Prepend the optional locale segment to each public route's path. */
function withLocalePrefix(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map((r) => ({ ...r, path: localizePath(r.path) }))
}

// Names of routes that participate in locale-prefixed URLs. Used by the guard
// to preserve the active locale across in-app navigation, and by the language
// switcher to decide between prefix navigation and in-place locale change.
export const LOCALIZED_ROUTE_NAMES = new Set<string>([
  'home',
  'privacy',
  'terms',
  'about',
  'contact',
  'changelog',
  'docs.embed',
])

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
]

// Locale-prefixed public/marketing pages (English bare, /de/…, /cs/…, /fr/…).
const legalRoutes: RouteRecordRaw[] = withLocalePrefix([
  {
    path: '/docs/embed',
    name: 'docs.embed',
    component: () => import('@/views/docs/EmbedDocsView.vue'),
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
    path: '/changelog',
    name: 'changelog',
    component: () => import('@/views/legal/ChangelogView.vue'),
    meta: { layout: layouts.Public },
  },
])

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
      path: localizePath('/'),
      name: 'home',
      component: Homepage,
      meta: { layout: layouts.Default },
    },
    ...authRoutes,
    ...appRoutes,
    ...embedRoutes,
    ...publicShareRoutes,
    ...legalRoutes,
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

// Locale guard — keeps the URL authoritative on direct visits (bare = English)
// while preserving the active locale across in-app navigation.
router.beforeEach((to, from) => {
  if (!LOCALIZED_ROUTE_NAMES.has(to.name as string)) return

  const localeStore = useLocaleStore()
  const param = to.params.locale as string | undefined

  if (isSupportedLocale(param)) {
    // Explicit locale in the URL always wins.
    localeStore.setLocale(param)
    return
  }

  const isInitialLoad = from === START_LOCATION

  // In-app navigation to a bare path while in a non-default locale: re-add the
  // prefix so the user stays in their language. Direct visits to bare paths
  // (initial load, SEO crawlers, shared links) resolve to English.
  if (!isInitialLoad && localeStore.current !== DEFAULT_LOCALE) {
    return {
      name: to.name as string,
      params: { ...to.params, locale: localeStore.current },
      query: to.query,
      hash: to.hash,
    }
  }

  localeStore.setLocale(DEFAULT_LOCALE)
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
