import { createI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = ['en', 'cs', 'de', 'fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

// Human-readable labels for the language switcher
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  cs: 'Čeština',
  de: 'Deutsch',
  fr: 'Français',
}

// Locales other than the default get a URL path prefix (e.g. /de/…).
// English stays bare (/…).
export const PREFIXED_LOCALES = SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE)

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Map an arbitrary browser language tag (e.g. "de-AT") to a supported locale,
 * falling back to the default.
 */
export function normalizeLocale(tag: string | null | undefined): Locale {
  if (!tag) return DEFAULT_LOCALE
  const base = tag.toLowerCase().split('-')[0]
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE
}

// Eagerly load every namespace JSON under ./locales/<locale>/<namespace>.json
// and assemble the vue-i18n messages object: { en: { home: {...} }, … }.
type MessageTree = Record<string, unknown>
type MessageModule = { default: MessageTree }
const modules = import.meta.glob<MessageModule>('./locales/**/*.json', { eager: true })

const messages: Record<string, MessageTree> = {}
for (const path in modules) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const locale = match[1]
  const namespace = match[2]
  if (!locale || !namespace || !isSupportedLocale(locale)) continue
  const mod = modules[path]
  if (!mod) continue
  const bucket = (messages[locale] ??= {})
  bucket[namespace] = mod.default
}

/**
 * Czech plural rule (CLDR): one (1), few (2–4), other (0, 5+).
 * Maps a count to an index into a 4-part `zero | one | few | other` message.
 * en/de/fr use vue-i18n's default rule (zero | one | other → indexes 0/1/2).
 */
function czechPluralRule(choice: number, choicesLength: number): number {
  const n = Math.abs(choice)
  if (n === 0 && choicesLength > 3) return 0        // dedicated "zero" form when provided
  if (n === 1) return choicesLength > 3 ? 1 : 1
  if (n >= 2 && n <= 4) return choicesLength > 3 ? 2 : Math.min(choicesLength - 1, 2)
  return choicesLength > 3 ? 3 : Math.min(choicesLength - 1, 2)
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  // Some doc/legal messages contain inline HTML rendered via v-html.
  warnHtmlMessage: false,
  pluralRules: {
    cs: czechPluralRule,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: messages as any,
})

export const t = i18n.global.t
