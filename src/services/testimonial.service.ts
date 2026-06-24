import http from '@/services/utils/http'

export interface ITestimonial {
  id: string
  author_name: string
  author_role: string | null
  author_avatar: string | null
  content: string
  rating: number
  is_featured: boolean
}

export const TestimonialService = {
  list() {
    return http.get<{ data: ITestimonial[] }>('/api/v1/testimonials')
  },
}
