import axios from 'axios'
import Cookies from 'js-cookie'
import { BASE_URL } from './apiConfig'

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// ── Request interceptor — attach token ────────────────────────────────────────
http.interceptors.request.use((config) => {
  const token =
    Cookies.get('fb_token') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('fb_token') : null)

  if (token) config.headers['Authorization'] = `Bearer ${token}`

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else {
    config.headers['Content-Type'] = 'application/json'
  }

  if (config.url && config.url.includes('/ubverse-service')) {
    config.headers['api-version'] = 'v1'
    config.headers['x-custom-lang'] = 'en'
  }

  return config
})

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

// ── Response interceptor — token renewal + 401 redirect ───────────────────────
http.interceptors.response.use(
  (res) => {
    if (res.headers['x-renew-token'] === 'true') {
      http.post('/renew').then((r) => {
        Cookies.set('fb_token', r.data.token, { expires: 1 })
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fb_token', r.data.token)
        }
      }).catch(() => {})
    }
    return res
  },
  async (err) => {
    const originalRequest = err.config
    const responseData = err.response?.data
    const message = responseData?.message || responseData?.error || ''
    const isExpiredMsg = typeof message === 'string'
      ? message.toLowerCase().includes('expired')
      : Array.isArray(message)
        ? message.some((m: any) => typeof m === 'string' && m.toLowerCase().includes('expired'))
        : false

    const isTokenExpired =
      err.response?.status === 401 ||
      (err.response?.status === 403 && isExpiredMsg)

    if (isTokenExpired && originalRequest && !originalRequest._retry && typeof window !== 'undefined') {
      const userStr = localStorage.getItem('fb_user')
      const user = userStr ? JSON.parse(userStr) : null
      const refreshToken = localStorage.getItem('fb_refresh_token')

      if (user?.scope === 'investor' && refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`
              resolve(http(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const refreshRes = await axios.post(
            'https://development.unboundxinc.us/api/user-service/user/refresh-token',
            { refreshToken },
            {
              headers: {
                'api-version': 'v1',
                'x-custom-lang': 'en',
                'Content-Type': 'application/json',
              }
            }
          )

          const refreshData = refreshRes.data?.success ? refreshRes.data.data : refreshRes.data
          const newToken = refreshData?.accessToken || refreshData?.token || refreshRes.data?.accessToken
          const newRefreshToken = refreshData?.refreshToken || refreshRes.data?.refreshToken

          if (newToken) {
            Cookies.set('fb_token', newToken, { expires: 1 })
            localStorage.setItem('fb_token', newToken)
            if (newRefreshToken) {
              localStorage.setItem('fb_refresh_token', newRefreshToken)
            }
            onRefreshed(newToken)
            isRefreshing = false

            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            return http(originalRequest)
          }
        } catch (refreshErr) {
          console.error('[Auth] Failed to refresh investor token:', refreshErr)
        } finally {
          isRefreshing = false
        }
      }

      Cookies.remove('fb_token')
      localStorage.removeItem('fb_token')
      localStorage.removeItem('fb_user')
      localStorage.removeItem('fb_refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Generic makeRequest helper ────────────────────────────────────────────────
export const makeRequest = async <T = unknown>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data: unknown = null,
  customHeaders?: Record<string, string>,
): Promise<T> => {
  const hasBody = data !== null && data !== undefined

  const response = await http({
    method,
    url,
    data: method !== 'get' && hasBody ? data : undefined,
    params: method === 'get' ? (data as Record<string, unknown>) : undefined,
    headers: customHeaders,
  })

  return response.data as T
}
