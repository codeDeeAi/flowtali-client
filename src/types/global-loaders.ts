export const loaders = {
  PageRouteChange: 'pageRouteChange',
  Logout: 'logout',
} as const

export type TLoaders = (typeof loaders)[keyof typeof loaders]
