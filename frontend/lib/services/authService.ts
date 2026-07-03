import { makeRequest } from '../httpClient'
import { apiEndpoints } from '../apiConfig'
import axios from 'axios'

export interface LoginResponse {
  message: string
  user: {
    _id: string
    email: string
    token: string
    [key: string]: any
  }
}

export const authService = {
  issuerLogin: (email: string, password: string, deviceToken = 'web') =>
    makeRequest<LoginResponse>(
      'post',
      apiEndpoints.auth.issuerLogin,
      { email, password, deviceToken },
      {
        'api-version': 'v1',
        'x-custom-lang': 'en',
      }
    ),

  investorLogin: (email: string, password: string, deviceToken = 'web') =>
    axios.post(
      'https://development.unboundxinc.us/api/user-service/user/login',
      { email, password, deviceToken, mobile_number: 'string' },
      {
        headers: {
          'api-version': 'v1',
          'x-custom-lang': 'en',
          'Content-Type': 'application/json',
        }
      }
    ).then((r) => r.data),

  issuerLogout: (email: string, deviceToken: string) =>
    makeRequest('post', apiEndpoints.auth.issuerLogout, { email, deviceToken }),

  renew: () =>
    makeRequest<{ token: string }>('post', apiEndpoints.auth.renew),
}
