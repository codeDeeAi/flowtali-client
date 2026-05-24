import http from '@/services/utils/http'
import type {
  IMember,
  IMemberFormData,
  IMemberListResponse,
  IAddMemberPayload,
  IUpdateMemberRolesPayload,
  IInvitation,
} from '@/types/member.types'

export const MemberService = {
  list(orgId: string, params?: { search?: string; page?: number; per_page?: number }) {
    return http.get<{ data: IMemberListResponse }>(`/api/v1/orgs/${orgId}/members`, { params })
  },

  formData(orgId: string) {
    return http.get<{ data: IMemberFormData }>(`/api/v1/orgs/${orgId}/members/form-data`)
  },

  get(orgId: string, memberId: string) {
    return http.get<{ data: IMember }>(`/api/v1/orgs/${orgId}/members/${memberId}`)
  },

  add(orgId: string, payload: IAddMemberPayload) {
    return http.post<{ data: IMember }>(`/api/v1/orgs/${orgId}/members`, payload)
  },

  updateRoles(orgId: string, memberId: string, payload: IUpdateMemberRolesPayload) {
    return http.put<{ data: IMember }>(`/api/v1/orgs/${orgId}/members/${memberId}/roles`, payload)
  },

  remove(orgId: string, memberId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/members/${memberId}`)
  },

  toggleActive(orgId: string, memberId: string) {
    return http.patch<{ data: IMember }>(`/api/v1/orgs/${orgId}/members/${memberId}/toggle-active`)
  },

  invite(orgId: string, payload: IAddMemberPayload) {
    return http.post<{ data: IInvitation }>(`/api/v1/orgs/${orgId}/invitations`, payload)
  },

  listInvitations(orgId: string) {
    return http.get<{ data: IInvitation[] }>(`/api/v1/orgs/${orgId}/invitations`)
  },

  cancelInvitation(orgId: string, invitationId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/invitations/${invitationId}`)
  },

  getInvitation(token: string) {
    return http.get<{ data: IInvitation }>(`/api/v1/invitations/${token}`)
  },

  acceptInvitation(token: string) {
    return http.post<{ data: any }>(`/api/v1/invitations/${token}/accept`, {})
  },
}
