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

/** A resolved deep-link the FE renders as an in-app link (e.g. an invoice number). */
export interface IAiReferenceLink {
  label: string
  href: string
}

export interface IAiChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** FE-only: resolved links to linkify inside this (assistant) message. */
  links?: IAiReferenceLink[]
}

/** Reference metadata from the API, before the FE resolves it to a route href. */
export interface IAiReference {
  label: string
  type: 'invoice'
  id: string
}

export interface IAiChatResponse {
  reply: string
  provider: AiProviderId
  model: string
  references?: IAiReference[]
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
