import { useHead } from '@unhead/vue'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/i18n'

interface SeoOptions {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  noIndex?: boolean
  /**
   * Unprefixed path of this page (e.g. '/', '/about'). When provided, emits
   * hreflang alternate links for every supported locale plus x-default.
   */
  localePath?: string
}

const BASE_URL = 'https://flowtali.com'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`

/** Build the absolute URL for a locale + unprefixed path (English is bare). */
function localizedUrl(locale: string, path: string): string {
  const clean = path === '/' ? '' : path
  return locale === DEFAULT_LOCALE ? `${BASE_URL}${clean || '/'}` : `${BASE_URL}/${locale}${clean}`
}

export function useSeo(options: SeoOptions) {
  const fullTitle = options.title.includes('Flowtali')
    ? options.title
    : `${options.title} — Flowtali`

  const alternateLinks = options.localePath
    ? [
        ...SUPPORTED_LOCALES.map((loc) => ({
          rel: 'alternate' as const,
          hreflang: loc,
          href: localizedUrl(loc, options.localePath!),
        })),
        {
          rel: 'alternate' as const,
          hreflang: 'x-default',
          href: localizedUrl(DEFAULT_LOCALE, options.localePath!),
        },
      ]
    : []

  useHead({
    title: fullTitle,
    meta: [
      { name: 'description', content: options.description },
      { name: 'robots', content: options.noIndex ? 'noindex, nofollow' : 'index, follow' },
      // Open Graph
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: options.description },
      { property: 'og:url', content: options.canonical ?? BASE_URL },
      { property: 'og:image', content: options.ogImage ?? DEFAULT_OG_IMAGE },
      // Twitter
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: options.description },
      { name: 'twitter:image', content: options.ogImage ?? DEFAULT_OG_IMAGE },
    ],
    link: [
      ...(options.canonical ? [{ rel: 'canonical' as const, href: options.canonical }] : []),
      ...alternateLinks,
    ],
  })
}
