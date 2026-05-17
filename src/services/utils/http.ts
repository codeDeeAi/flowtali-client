import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { httpStatus } from '@/types/httpstatus'
import axios, { type AxiosInstance } from 'axios'

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

http.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()

    const token = authStore.getToken

    if (token && token !== null) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

http.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (
      error.response?.status === httpStatus.UNAUTHORIZED &&
      window.location.pathname !== '/signin'
    ) {
      console.warn('Unauthorized request - redirecting to login')

      const authStore = useAuthStore()

      const currentPath = window.location.pathname + window.location.search

      authStore.logout()

      authStore.clearAuthData()

      router.push({ name: 'signin', query: { redirect: currentPath } })

      return
    }

    if (error.response?.status === httpStatus.PRECONDITION_FAILED) {
      console.warn('Mandatory password action required - redirecting to action page')

      const authStore = useAuthStore()

      const currentPath = window.location.pathname + window.location.search

      if (authStore.isLoggedIn && authStore.getUser !== null) {
        router.push({ name: 'signin', query: { redirect: currentPath } })

        return
      }

      authStore.logout()

      authStore.clearAuthData()

      router.push({ name: 'signin', query: { redirect: currentPath } })

      return
    }
    return Promise.reject(error)
  },
)

export default http
