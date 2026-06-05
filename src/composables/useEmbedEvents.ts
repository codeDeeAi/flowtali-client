import { useRoute } from 'vue-router'

export type EmbedEventName =
  | 'invoice.created' | 'invoice.updated' | 'invoice.deleted'
  | 'project.created' | 'project.updated' | 'project.deleted'
  | 'receipt.created' | 'receipt.updated' | 'receipt.deleted'
  | 'client.created'  | 'client.updated'  | 'client.deleted'

/**
 * Emit a structured event to the parent page via postMessage.
 * Only fires when running inside an embed route — safe to call from any view.
 */
export function useEmbedEvents() {
  const route = useRoute()

  function emit(event: EmbedEventName, data?: unknown) {
    if (!route.meta.embed) return
    window.parent.postMessage({ type: 'FLOWTALI_EVENT', event, data }, '*')
  }

  return { emit }
}
