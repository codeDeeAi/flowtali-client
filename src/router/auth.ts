import { layouts } from '@/types/layout'

const meta = { layout: layouts.Default }

export const authRoutes = [
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/views/auth/SignupPage.vue'),
    meta,
  },
  {
    path: '/signin',
    name: 'signin',
    component: () => import('@/views/auth/SigninPage.vue'),
    meta,
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordPage.vue'),
    meta,
  },
  {
    path: '/auth/reset-password',
    name: 'auth.reset-password',
    component: () => import('@/views/auth/ResetPasswordPage.vue'),
    meta,
  },
  {
    path: '/auth/verify-email',
    name: 'auth.verify-email',
    component: () => import('@/views/auth/VerifyEmailPage.vue'),
    meta,
  },
  {
    path: '/auth/mfa-verify',
    name: 'auth.mfa-verify',
    component: () => import('@/views/auth/MfaVerifyPage.vue'),
    meta,
  },
  {
    path: '/auth/magic-login',
    name: 'auth.magic-login',
    component: () => import('@/views/auth/MagicLoginPage.vue'),
    meta,
  },
  {
    path: '/auth/magic-login/verify',
    name: 'auth.magic-login.verify',
    component: () => import('@/views/auth/MagicLoginPage.vue'),
    meta,
  },
  {
    path: '/auth/google/callback',
    name: 'auth.google-callback',
    component: () => import('@/views/auth/GoogleCallbackPage.vue'),
    meta,
  },
]
