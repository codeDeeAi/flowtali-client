import http from './utils/http'

export interface IInboxNotification {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, any> | null
  read_at: string | null
  created_at: string
}

export const NotificationInboxService = {
  list(orgId: string, page = 1) {
    return http.get<{
      data: {
        data: IInboxNotification[]
        current_page: number
        last_page: number
        total: number
      }
    }>(`/api/v1/orgs/${orgId}/notifications`, { params: { page, per_page: 20 } })
  },

  unreadCount(orgId: string) {
    return http.get<{ data: { count: number } }>(`/api/v1/orgs/${orgId}/notifications/count`)
  },

  markRead(orgId: string, notificationId: string) {
    return http.put(`/api/v1/orgs/${orgId}/notifications/${notificationId}/read`)
  },

  markAllRead(orgId: string) {
    return http.put(`/api/v1/orgs/${orgId}/notifications/read-all`)
  },
}
