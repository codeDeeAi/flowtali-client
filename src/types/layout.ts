export const layouts = {
  App: 'AppLayout',
  Default: 'DefaultLayout',
  Public: 'PublicLayout',
  Embed: 'EmbedLayout',
} as const

export type TLayout = typeof layouts[keyof typeof layouts];
