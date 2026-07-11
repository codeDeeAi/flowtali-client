import http from '@/services/utils/http'
import type {
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
