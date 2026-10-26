import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type CreateMode = 'quick' | 'full'
type DocKind = 'invoice' | 'receipt'

const storageKey = (kind: DocKind) => `flowtali.createMode.${kind}`

function readStored(kind: DocKind): CreateMode | null {
  try {
    const v = localStorage.getItem(storageKey(kind))
    return v === 'quick' || v === 'full' ? v : null
  } catch {
    return null
  }
}

/**
 * Quick vs Full create mode for a document. Resolved from `?mode=`, then the
 * user's last choice, defaulting to Quick. Embeds always use the full editor.
 */
export function useCreateMode(kind: DocKind) {
  const route  = useRoute()
  const router = useRouter()

  const isEmbed = computed(() => !!route.meta.embed)
  const fromQuery = route.query.mode === 'quick' || route.query.mode === 'full' ? route.query.mode : null
  const mode = ref<CreateMode>(isEmbed.value ? 'full' : (fromQuery ?? readStored(kind) ?? 'quick'))

  watch(mode, (m) => {
    try { localStorage.setItem(storageKey(kind), m) } catch { /* storage unavailable */ }
    router.replace({ query: { ...route.query, mode: m } })
  })

  return { mode, isEmbed }
}
