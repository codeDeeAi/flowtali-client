import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SubscriptionService, type ISubscription } from '@/services/subscription.service'
import { useAuthStore } from './auth'

export const useSubscriptionStore = defineStore('subscription', () => {
  const authStore    = useAuthStore()
  const subscription = ref<ISubscription | null>(null)
  const isLoading    = ref(false)

  const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '')

  const planSlug   = computed(() => subscription.value?.plan?.slug ?? 'starter')
  const isActive   = computed(() => subscription.value?.is_active ?? false)
  const isStarter  = computed(() => planSlug.value === 'starter')
  const isPro      = computed(() => ['pro', 'business'].includes(planSlug.value))
  const isBusiness = computed(() => planSlug.value === 'business')

  function canUse(feature: string): boolean {
    const features = subscription.value?.plan?.features ?? {}
    const val      = features[feature]
    if (val === undefined) return false
    if (val === null)      return true   // unlimited
    if (val === false)     return false
    if (typeof val === 'number') return val > 0
    return !!val
  }

  function getLimit(feature: string): number | null {
    const val = subscription.value?.plan?.features?.[feature]
    if (val === null || val === undefined) return null
    return typeof val === 'number' ? val : null
  }

  async function load() {
    if (!orgId.value) return
    isLoading.value = true
    try {
      const res          = await SubscriptionService.getSubscription(orgId.value)
      subscription.value = res.data.data
    } catch {
      subscription.value = null
    } finally {
      isLoading.value = false
    }
  }

  function $reset() {
    subscription.value = null
    isLoading.value    = false
  }

  return {
    subscription,
    isLoading,
    planSlug,
    isActive,
    isStarter,
    isPro,
    isBusiness,
    canUse,
    getLimit,
    load,
    $reset,
  }
})
