import { onMounted, onUnmounted } from 'vue'

export interface EmbedAppearance {
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  fontFamily?: string
  borderRadius?: string
}

const CSS_VAR_MAP: Record<keyof EmbedAppearance, string> = {
  primaryColor:    '--color-amber',
  backgroundColor: '--color-charcoal-900',
  textColor:       '--color-cream',
  fontFamily:      '--font-sans',
  borderRadius:    '--embed-radius',
}

function applyAppearance(appearance: EmbedAppearance) {
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP) as [keyof EmbedAppearance, string][]) {
    const val = appearance[key]
    if (val) {
      root.style.setProperty(cssVar, val)
    }
  }
}

export function useEmbedTheme() {
  function onMessage(event: MessageEvent) {
    if (event.data?.type === 'FLOWTALI_THEME' && event.data.appearance) {
      applyAppearance(event.data.appearance)
    }
  }

  onMounted(() => {
    window.addEventListener('message', onMessage)
    // Signal to the parent SDK that the embed is ready to receive theme.
    window.parent.postMessage({ type: 'FLOWTALI_READY' }, '*')
  })

  onUnmounted(() => {
    window.removeEventListener('message', onMessage)
  })
}
