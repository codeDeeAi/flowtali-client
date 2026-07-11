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

export type AiTone = 'formal' | 'friendly' | 'firm' | 'persuasive'
export type AiLength = 'short' | 'standard' | 'detailed'
export type AiTransformAction = 'rewrite_shorter' | 'rewrite_formal' | 'fix_grammar' | 'translate' | 'describe'

export interface IAiLetterheadDraftPayload {
  brief: string
  tone?: AiTone
  length?: AiLength
  language?: string
  recipient?: string
}

export interface IAiLetterheadDraft {
  subject: string
  salutation: string
  body: string
  closing: string
}

export interface IAiTransformPayload {
  action: AiTransformAction
  text: string
  language?: string
  context?: 'line_item' | 'letter' | 'generic'
}
