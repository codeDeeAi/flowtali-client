import type { ILoginData, IOrganization } from '@/types/auth.types'

export interface IAuthUser extends Omit<ILoginData, 'organizations'> {}

export interface IState {
  isAuthenticated: boolean
  user: IAuthUser | null
  organizations: IOrganization[]
  currentOrganization: IOrganization | null
}
