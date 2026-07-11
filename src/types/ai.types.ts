export type AiProviderId = 'claude' | 'openai' | 'gemini'

export interface IAiModelOption {
  id: string
  label: string
}

export interface IAiProvider {
  id: AiProviderId
  label: string
  default_model: string
  models: IAiModelOption[]
  console_url: string
  key_prefix: string
}

/** The masked, client-safe credential shape. The raw key is never returned. */
export interface IAiCredential {
  provider: AiProviderId
  model: string | null
  key_last_four: string | null
  is_active: boolean
  last_used_at: string | null
  last_validated_at: string | null
}

export interface ISaveAiCredentialPayload {
  provider: AiProviderId
  api_key: string
  model?: string | null
}

export interface IAiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface IAiChatResponse {
  reply: string
  provider: AiProviderId
  model: string
}
