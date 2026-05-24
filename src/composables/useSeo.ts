import { useHead } from '@unhead/vue'

interface SeoOptions {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  noIndex?: boolean
}

const BASE_URL = 'https://flowtali.com'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`

export function useSeo(options: SeoOptions) {
  const fullTitle = options.title.includes('Flowtali')
    ? options.title
    : `${options.title} — Flowtali`

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
    link: options.canonical
      ? [{ rel: 'canonical', href: options.canonical }]
      : [],
  })
}
