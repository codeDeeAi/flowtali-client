export interface IPermission {
  identifier: string
  tag: string
  name: string
  description: string
  group: string
}

export interface IPermissionGroup {
  name: string
  description: string
  group_name: string
  permissions: IPermission[]
}

export interface IRole {
  id: string
  name: string
  description: string | null
  permissions: string[]
  immutable: boolean
  is_disabled: boolean
  member_roles_count: number
  created_at: string
  updated_at: string
}

export interface IRoleFormData {
  permission_groups: IPermissionGroup[]
}

export interface IRoleListResponse {
  data: IRole[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export interface ICreateRolePayload {
  name: string
  description?: string | null
  permissions: string[]
}

export interface IUpdateRolePayload {
  name?: string
  description?: string | null
  permissions?: string[]
}
