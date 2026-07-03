import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'

export function useIssuerLogin() {
  return useMutation({
    mutationFn: ({ email, password, deviceToken }: { email: string; password: string; deviceToken?: string }) =>
      authApi.issuerLogin(email, password, deviceToken),
  })
}

export function useInvestorLogin() {
  return useMutation({
    mutationFn: ({ email, password, deviceToken }: { email: string; password: string; deviceToken?: string }) =>
      authApi.investorLogin(email, password, deviceToken),
  })
}

export function useIssuerLogout() {
  return useMutation({
    mutationFn: ({ email, deviceToken }: { email: string; deviceToken: string }) =>
      authApi.issuerLogout(email, deviceToken),
  })
}
