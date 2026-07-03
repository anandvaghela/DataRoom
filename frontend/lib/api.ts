/**
 * lib/api.ts — central barrel export
 *
 * Structure:
 *   lib/httpClient.ts          — axios instance + interceptors + makeRequest
 *   lib/apiConfig.ts           — all endpoint strings (DDMS only)
 *   lib/services/authService   — login / renew
 *   lib/services/ddmsService   — folders, documents, permissions, investor
 *   lib/hooks/useDDMS.ts       — React Query hooks for all DDMS operations
 *   lib/queryKeys.ts           — React Query cache key constants
 */

export { http as api } from './httpClient'
export { makeRequest } from './httpClient'
export { apiEndpoints, BASE_URL } from './apiConfig'

// ── Auth ───────────────────────────────────────────────────────────────────────
export { authService as authApi } from './services/authService'

// ── Legacy API Stubs (to prevent compiler errors in unused settings files) ─────
export const settingsApi = { get: async () => ({}), update: async () => ({}) } as any
export const sharesApi = {} as any
export const userSharesApi = {} as any
export const usersApi = {} as any

// ── DDMS ───────────────────────────────────────────────────────────────────────
export {
  ddmsFoldersService,
  ddmsDocumentsService,
  ddmsPermissionsService,
  ddmsInvestorService,
  ddmsShareTokensService,
  ddmsExternalShareService,
  ddmsAuditLogsService,
} from './services/ddmsService'

export type {
  DDMSFolder,
  DDMSDocument,
  DDMSFolderContents,
  DDMSUploadInitResponse,
  DDMSDocumentUrlResponse,
  DDMSPermission,
  CreateFolderBody,
  RenameFolderBody,
  MoveFolderBody,
  CopyFolderBody,
  UploadDocumentBody,
  RenameDocumentBody,
  MoveDocumentBody,
  CopyDocumentBody,
  GrantPermissionBody,
  CreateShareTokenBody,
  VerifyShareBody,
  ListAuditLogsParams,
  DDMSShareToken,
  ExternalShareValidationResponse,
  ExternalShareVerifyResponse,
  DDMSAuditLog,
  DDMSAuditLogsResponse,
} from './services/ddmsService'

// ── Auth helpers ───────────────────────────────────────────────────────────────
import Cookies from 'js-cookie'
import { User } from '@/types'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return Cookies.get('fb_token') || localStorage.getItem('fb_token')
}

export function setToken(token: string, user: User, refreshToken?: string) {
  Cookies.set('fb_token', token, { expires: 1 })
  localStorage.setItem('fb_token', token)
  localStorage.setItem('fb_user', JSON.stringify(user))
  if (refreshToken) {
    localStorage.setItem('fb_refresh_token', refreshToken)
  }
}

export function clearAuth() {
  Cookies.remove('fb_token')
  localStorage.removeItem('fb_token')
  localStorage.removeItem('fb_user')
  localStorage.removeItem('fb_refresh_token')
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('ddms_company_legal_name')
  }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('fb_user')
  return u ? JSON.parse(u) : null
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
