export interface IMemberUser {
  id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  profile_photo: string | null
}

export interface IMemberRole {
  id: string
  name: string
  description: string | null
}

export interface IMember {
  id: string
  user_id: string
  organization_id: string
  is_owner: boolean
  is_active: boolean
  user: IMemberUser
  roles: IMemberRole[]
  created_at: string
  updated_at: string
}

export interface IMemberFormData {
  roles: IMemberRole[]
}

export interface IMemberListResponse {
  data: IMember[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export interface IAddMemberPayload {
  email: string
  role_ids: string[]
}

export interface IUpdateMemberRolesPayload {
  role_ids: string[]
}

export interface IInvitation {
  id: string
  email: string
  role_ids: string[]
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  expires_at: string
  invited_by: { id: string; name: string; email: string } | null
  organization: { id: string; name: string; logo: string | null } | null
  created_at: string
}
