import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Render assistant/chat Markdown to HTML. Configured for chat replies:
//  - `gfm` + `breaks` so single newlines become <br> (LLMs rely on them).
marked.setOptions({ gfm: true, breaks: true })

// Any links the model emits open in a new tab, and can't reach window.opener.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export interface MarkdownLink {
  /** Exact text to linkify wherever it appears (e.g. an invoice number). */
  label: string
  /** In-app href the label should point to. */
  href: string
}

/**
 * Convert Markdown to sanitized HTML for rendering with `v-html`.
 *
 * The input is untrusted (LLM output), so the parsed HTML is always run through
 * DOMPurify before it reaches the DOM — this strips scripts, event handlers and
 * any other XSS vectors while keeping the formatting tags (headings, lists,
 * bold, code, links, tables…).
 *
 * When `links` are supplied, exact occurrences of each label in the *text* are
 * wrapped in `<a data-internal href>` anchors AFTER sanitizing — the hrefs come
 * from our own router (trusted), and the label text is inserted via textContent
 * (escaped), so this adds no injection surface.
 */
export function renderMarkdown(source: string, links: MarkdownLink[] = []): string {
  const html = marked.parse(source ?? '', { async: false }) as string
  const clean = DOMPurify.sanitize(html)

  return links.length ? linkifyLabels(clean, links) : clean
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function linkifyLabels(html: string, links: MarkdownLink[]): string {
  const byLabel = new Map(links.map((l) => [l.label, l.href]))
  // Longest-first so "INV-0043-2" wins over "INV-0043".
  const pattern = links
    .map((l) => l.label)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  const re = new RegExp(`(${pattern})`, 'g')

  const tpl = document.createElement('template')
  tpl.innerHTML = html

  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    // Skip text already inside an anchor — don't nest links.
    if (text.parentElement?.closest('a')) continue
    if (re.test(text.data)) targets.push(text)
    re.lastIndex = 0
  }

  for (const text of targets) {
    const frag = document.createDocumentFragment()
    const data = text.data
    let last = 0
    for (const m of data.matchAll(re)) {
      const start = m.index ?? 0
      if (start > last) frag.appendChild(document.createTextNode(data.slice(last, start)))
      const a = document.createElement('a')
      a.setAttribute('href', byLabel.get(m[0]) ?? '#')
      a.setAttribute('data-internal', 'true')
      a.textContent = m[0]
      frag.appendChild(a)
      last = start + m[0].length
    }
    if (last < data.length) frag.appendChild(document.createTextNode(data.slice(last)))
    text.parentNode?.replaceChild(frag, text)
  }

  return tpl.innerHTML
}
