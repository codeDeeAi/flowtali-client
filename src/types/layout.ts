export const layouts = {
  App: 'AppLayout',
  Default: 'DefaultLayout',
  Public: 'PublicLayout',
} as const

export type TLayout = typeof layouts[keyof typeof layouts];
