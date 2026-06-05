import http from '@/services/utils/http'

export interface IFeedbackPayload {
  type: 'general' | 'bug' | 'feature' | 'other'
  message: string
  rating?: number | null
  page_url?: string
  organization_id?: string | null
  metadata?: Record<string, unknown>
}

export const FeedbackService = {
  submit(payload: IFeedbackPayload) {
    return http.post('/api/v1/feedback', payload)
  },
}
