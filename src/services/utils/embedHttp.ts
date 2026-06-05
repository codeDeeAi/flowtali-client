import axios, { type AxiosInstance } from 'axios'
import { useEmbedAuthStore } from '@/stores/embedAuth'

const embedHttp: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

embedHttp.interceptors.request.use((config) => {
  const embedStore = useEmbedAuthStore()
  const token = embedStore.token
  if (token) {
    config.headers['X-Embed-Token'] = token
  }
  return config
})

export default embedHttp
