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

/** A saved chat in the history sidebar (no message bodies). */
export interface IAiChatListItem {
  id: string
  title: string
  last_message_at: string | null
}

/** A full saved chat with its restored messages. */
export interface IAiChatFull {
  id: string
  title: string
  messages: IAiChatMessage[]
  last_message_at: string | null
}

/** A mutating action the agent has prepared, awaiting the user's confirmation. */
export interface IAiPendingAction {
  name: string
  args: Record<string, unknown>
}

export interface IAiChatResponse {
  reply: string
  provider: AiProviderId
  model: string
  references?: IAiReference[]
  /** Actions the agent prepared this turn — the UI confirms them before running. */
  pending_actions?: IAiPendingAction[]
}

/** Result of executing a confirmed action. `message`/`link` power the follow-up. */
export interface IAiActionResult {
  created?: boolean
  updated?: boolean
  error?: string
  message?: string
  link?: string
  url?: string
  [key: string]: unknown
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
