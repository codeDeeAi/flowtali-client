import http from '@/services/utils/http'
import type {
  IAiActionResult,
  IAiChatFull,
  IAiChatListItem,
  IAiChatMessage,
  IAiChatResponse,
  IAiCredential,
  IAiLetterheadDraft,
  IAiLetterheadDraftPayload,
  IAiProvider,
  IAiTransformPayload,
  ISaveAiCredentialPayload,
} from '@/types/ai.types'

export const AiService = {
  /** Provider catalog for the settings UI (labels, models, console URLs). */
  providers(orgId: string) {
    return http.get<{ data: { providers: IAiProvider[] } }>(
      `/api/v1/orgs/${orgId}/ai/providers`,
    )
  },

  /** Lightweight availability check for any member (no settings permission). */
  status(orgId: string) {
    return http.get<{ data: { configured: boolean; provider: string | null; model: string | null } }>(
      `/api/v1/orgs/${orgId}/ai/status`,
    )
  },

  /** The org's saved credential in masked form (or null). Never the key. */
  getCredential(orgId: string) {
    return http.get<{ data: { credential: IAiCredential | null } }>(
      `/api/v1/orgs/${orgId}/ai/credential`,
    )
  },

  /** Validate + store a pasted key (encrypted server-side). */
  saveCredential(orgId: string, payload: ISaveAiCredentialPayload) {
    return http.put<{ data: { credential: IAiCredential } }>(
      `/api/v1/orgs/${orgId}/ai/credential`,
      payload,
    )
  },

  deleteCredential(orgId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/ai/credential`)
  },

  /** Send a conversation to the org's connected provider. `locale` steers the reply language. */
  chat(orgId: string, messages: IAiChatMessage[], locale?: string) {
    return http.post<{ data: IAiChatResponse }>(`/api/v1/orgs/${orgId}/ai/chat`, {
      messages,
      locale,
    })
  },

  /** Run a mutating action the user confirmed in the chat modal. */
  executeAction(orgId: string, name: string, args: Record<string, unknown>) {
    return http.post<{ data: { result: IAiActionResult } }>(
      `/api/v1/orgs/${orgId}/ai/actions/execute`,
      { name, args },
    )
  },

  // ── Chat history (per user, auto-pruned after 14 days) ────────────────────
  listChats(orgId: string, cursor?: string | null) {
    return http.get<{ data: { chats: IAiChatListItem[]; next_cursor: string | null; retention_days: number } }>(
      `/api/v1/orgs/${orgId}/ai/chats`,
      { params: { cursor: cursor || undefined } },
    )
  },

  getChat(orgId: string, chatId: string) {
    return http.get<{ data: { chat: IAiChatFull } }>(`/api/v1/orgs/${orgId}/ai/chats/${chatId}`)
  },

  /** Create-or-update a chat from the current messages. Returns the saved item. */
  saveChat(orgId: string, payload: { chat_id: string | null; title?: string; messages: IAiChatMessage[] }) {
    return http.post<{ data: { chat: IAiChatListItem } }>(`/api/v1/orgs/${orgId}/ai/chats/save`, payload)
  },

  deleteChat(orgId: string, chatId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/ai/chats/${chatId}`)
  },

  /** Draft the four Content-tab fields of a letterhead from a natural-language brief. */
  draftLetterhead(orgId: string, payload: IAiLetterheadDraftPayload) {
    return http.post<{ data: { draft: IAiLetterheadDraft } }>(
      `/api/v1/orgs/${orgId}/ai/letterhead/draft`,
      payload,
    )
  },

  /** Rewrite / translate / describe a piece of text. Returns the transformed text. */
  transformText(orgId: string, payload: IAiTransformPayload) {
    return http.post<{ data: { text: string } }>(
      `/api/v1/orgs/${orgId}/ai/text/transform`,
      payload,
    )
  },
}
