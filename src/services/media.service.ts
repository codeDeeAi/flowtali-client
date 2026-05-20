import http from './utils/http'

export interface IMediaRecord {
  id: string
  type: string
  url: string
  extras: Record<string, unknown>
}

export const MediaService = {
  upload(formData: FormData) {
    return http.post<{ data: IMediaRecord[] }>('/api/v1/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  delete(ids: string[]) {
    return http.delete('/api/v1/media', { params: { ids: ids.join(',') } })
  },
}
