import axios from 'axios'
import { http, makeRequest } from '../httpClient'
import { apiEndpoints } from '../apiConfig'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DDMSFolder {
  id: string
  name: string
  parent_id: string | null
  issuer_id: string
  created_at: string
  updated_at: string
  size?: number
}

export interface DDMSDocument {
  id: string
  folder_id: string
  filename: string
  mimetype: string
  size: number
  issuer_id: string
  created_at: string
  updated_at: string
}

export interface DDMSFolderContents {
  folders: DDMSFolder[]
  documents: DDMSDocument[]
  folder?: DDMSFolder | null
}

export interface DDMSUploadInitResponse {
  document_id: string
  upload_url: string
}

export interface DDMSDocumentUrlResponse {
  url: string
  expires_at: string
}

export interface DDMSPermission {
  id: string
  folder_id?: string
  document_id?: string
  granted_to: string
  expires_at?: string
  created_at: string
}

export interface DDMSPermissionInvestor {
  id: number
  cognito_id: string
  cognito_sub: string
  email: string
  first_name: string
  last_name: string
  mobile_number: string
  country_code: string
  profile_pic_url: string | null
  profile_background_image: string | null
  has_permission: boolean
  permission_id: string | null
}

// ── Request body types ────────────────────────────────────────────────────────

export interface CreateFolderBody {
  parent_id: string
  name: string
}

export interface RenameFolderBody {
  name: string
}

export interface MoveFolderBody {
  parent_id: string
}

export interface CopyFolderBody {
  parent_id: string
  name: string
}

export interface UploadDocumentBody {
  folder_id: string
  filename: string
  mimetype: string
  size: number
}

export interface RenameDocumentBody {
  filename: string
}

export interface MoveDocumentBody {
  folder_id: string
}

export interface CopyDocumentBody {
  folder_id: string
}

export interface GrantPermissionBody {
  folder_id?: string
  document_id?: string
  granted_to: string
  expires_at?: string
}

export interface CreateShareTokenBody {
  document_id: string
  external_email: string
  provider: string
  expires_at: string
  max_uses: number
}

export interface VerifyShareBody {
  id_token: string
}

export interface ListAuditLogsParams {
  issuer_id?: string
  action?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

// ── DDMS Folders service ──────────────────────────────────────────────────────

export const ddmsFoldersService = {
  /**
   * Get full nested folder tree with documents for the authenticated issuer
   */
  getTree: () =>
    http.get(apiEndpoints.ddmsFolders.tree)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload)
      }),

  /**
   * List provisioned root folders for the authenticated issuer
   */
  getRoots: () =>
    http.get(apiEndpoints.ddmsFolders.roots)
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        const roots = (data?.roots || data || []) as any[]
        const companyName = data?.issuer?.company_legal_name
        if (companyName && typeof window !== 'undefined') {
          sessionStorage.setItem('ddms_company_legal_name', companyName)
        }
        if (companyName && Array.isArray(roots)) {
          roots.forEach((root) => {
            root.owner = companyName
          })
        }
        return roots as DDMSFolder[]
      }),

  /**
   * List subfolders and documents inside a folder
   */
  getContents: (id: string) =>
    http.get(apiEndpoints.ddmsFolders.contents(id))
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        return {
          folders: data?.subfolders || data?.folders || [],
          documents: data?.documents || [],
          folder: data?.folder || null,
        } as DDMSFolderContents
      }),

  /**
   * Create a sub-folder inside an issuer directory tree
   */
  create: (body: CreateFolderBody) =>
    http.post(apiEndpoints.ddmsFolders.create, body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSFolder
      }),

  /**
   * Rename a folder
   */
  rename: (id: string, body: RenameFolderBody) =>
    http.patch(apiEndpoints.ddmsFolders.rename(id), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSFolder
      }),

  /**
   * Delete a folder recursively
   */
  delete: (id: string) =>
    makeRequest('delete', apiEndpoints.ddmsFolders.delete(id))
      .then((res: any) => {
        return res?.success ? res.data : res
      }),

  /**
   * Move a folder to a new parent
   */
  move: (id: string, body: MoveFolderBody) =>
    http.post(apiEndpoints.ddmsFolders.move(id), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSFolder
      }),

  /**
   * Copy a folder recursively
   */
  copy: (id: string, body: CopyFolderBody) =>
    http.post(apiEndpoints.ddmsFolders.copy(id), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSFolder
      }),

  /**
   * Get all investors for admin panel
   */
  getInvestors: () =>
    http.get(apiEndpoints.ddmsFolders.investors)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as any[]
      }),
}

// ── DDMS Documents service ────────────────────────────────────────────────────

export const ddmsDocumentsService = {
  /**
   * Initiate document upload — returns a pre-signed PUT URL.
   * After calling this, upload the file directly to `upload_url` using PUT,
   * then you're done (no separate "complete" step needed).
   */
  initiateUpload: (body: UploadDocumentBody) =>
    http.post(apiEndpoints.ddmsDocuments.upload, body)
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        return {
          document_id: data?.document?.document_id || data?.document_id || '',
          upload_url: data?.upload_url || '',
        } as DDMSUploadInitResponse
      }),

  /**
   * Upload a file using the pre-signed PUT URL returned by initiateUpload.
   * Handles progress tracking.
   */
  uploadToPresignedUrl: async (
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
  },

  /**
   * Full upload helper — combines initiateUpload + uploadToPresignedUrl.
   * Returns the created DDMSDocument metadata.
   */
  upload: async (
    folderId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<DDMSUploadInitResponse> => {
    const initRes = await ddmsDocumentsService.initiateUpload({
      folder_id: folderId,
      filename: file.name,
      mimetype: file.type || 'application/octet-stream',
      size: file.size,
    })

    await ddmsDocumentsService.uploadToPresignedUrl(
      initRes.upload_url,
      file,
      onProgress,
    )

    return initRes
  },

  /**
   * Search documents by filename
   */
  search: (q: string, issuerId?: string) =>
    http.get(apiEndpoints.ddmsDocuments.search, {
      params: { q, ...(issuerId ? { issuer_id: issuerId } : {}) },
    }).then((r) => {
      const payload = r.data as any
      return (payload?.success ? payload.data : payload) as DDMSDocument[]
    }),

  /**
   * Generate a short-lived pre-signed GET URL for a document
   */
  getUrl: (id: string) =>
    http.get(apiEndpoints.ddmsDocuments.url(id))
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSDocumentUrlResponse
      }),

  /**
   * Rename a document
   */
  rename: (id: string, body: RenameDocumentBody) =>
    http.patch(apiEndpoints.ddmsDocuments.rename(id), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSDocument
      }),

  /**
   * Soft-delete a document
   */
  delete: (id: string) =>
    makeRequest('delete', apiEndpoints.ddmsDocuments.delete(id))
      .then((res: any) => {
        return res?.success ? res.data : res
      }),

  /**
   * Move a document to another folder
   */
  move: (id: string, body: MoveDocumentBody) =>
    http.post(apiEndpoints.ddmsDocuments.move(id), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSDocument
      }),

  /**
   * Copy a document
   */
  copy: (id: string, body: CopyDocumentBody) =>
    http.post(apiEndpoints.ddmsDocuments.copy(id), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSDocument
      }),
}

// ── DDMS Permissions service ──────────────────────────────────────────────────

export const ddmsPermissionsService = {
  /**
   * Get active permissions for a folder or document
   */
  getPermissions: (params: { folder_id?: string; document_id?: string }) =>
    http.get(apiEndpoints.ddmsPermissions.list, { params })
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        return (Array.isArray(data) ? data : data ? [data] : []) as DDMSPermissionInvestor[]
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          return []
        }
        throw err
      }),

  /**
   * Grant investor view access to a private folder or document
   */
  grant: (body: GrantPermissionBody) =>
    http.post(apiEndpoints.ddmsPermissions.grant, body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSPermission
      }),

  /**
   * Revoke investor access
   */
  revoke: (id: string) =>
    makeRequest('delete', apiEndpoints.ddmsPermissions.revoke(id))
      .then((res: any) => {
        return res?.success ? res.data : res
      }),
}

// ── DDMS Investor service (permission-scoped) ─────────────────────────────────

export const ddmsInvestorService = {
  /**
   * Get full nested folder tree with documents for the authenticated investor by issuer id
   */
  getTree: (issuerId: string) =>
    http.get(apiEndpoints.ddmsInvestor.tree(issuerId))
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload)
      }),

  /**
   * List public root folders for all issuers plus private roots where investor NDA is signed
   */
  getRoots: () =>
    http.get(apiEndpoints.ddmsInvestor.roots)
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        const roots = (data?.roots || data || []) as any[]
        return roots as DDMSFolder[]
      }),

  /**
   * List issuer root folders visible to the investor
   */
  getIssuerRoots: (issuerId: string) =>
    http.get(apiEndpoints.ddmsInvestor.issuerRoots(issuerId))
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        const roots = (data?.roots || data || []) as any[]
        const companyName = data?.issuer?.company_legal_name
        if (companyName && typeof window !== 'undefined') {
          sessionStorage.setItem('ddms_company_legal_name', companyName)
        }
        if (companyName && Array.isArray(roots)) {
          roots.forEach((root) => {
            root.owner = companyName
          })
        }
        return roots as DDMSFolder[]
      }),

  /**
   * List folder contents for investor (permission-scoped)
   */
  getFolderContents: (id: string) =>
    http.get(apiEndpoints.ddmsInvestor.folderContents(id))
      .then((r) => {
        const payload = r.data as any
        const data = payload?.success ? payload.data : payload
        return {
          folders: data?.subfolders || data?.folders || [],
          documents: data?.documents || [],
          folder: data?.folder || null,
        } as DDMSFolderContents
      }),

  /**
   * Search documents for investor (permission-scoped)
   */
  searchDocuments: (q: string, issuerId?: string) =>
    http.get(apiEndpoints.ddmsInvestor.searchDocuments, {
      params: { q, ...(issuerId ? { issuer_id: issuerId } : {}) },
    }).then((r) => {
      const payload = r.data as any
      return (payload?.success ? payload.data : payload) as DDMSDocument[]
    }),

  /**
   * Get document view URL for investor (permission-scoped)
   */
  getDocumentUrl: (id: string) =>
    http.get(apiEndpoints.ddmsInvestor.documentUrl(id))
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSDocumentUrlResponse
      }),
}

// ── DDMS Share Tokens service ────────────────────────────────────────────────

export interface DDMSShareToken {
  id: string
  document_id: string
  external_email: string
  provider: string
  expires_at: string
  max_uses: number
  created_at: string
}

export const ddmsShareTokensService = {
  /**
   * Create an external share token for a document
   */
  create: (body: CreateShareTokenBody) =>
    http.post(apiEndpoints.ddmsShareTokens.create, body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSShareToken
      }),

  /**
   * Revoke an external share token
   */
  revoke: (id: string) =>
    makeRequest('delete', apiEndpoints.ddmsShareTokens.revoke(id))
      .then((res: any) => {
        return res?.success ? res.data : res
      }),
}

// ── DDMS External Share service ─────────────────────────────────────────────

export interface ExternalShareValidationResponse {
  provider: string
  external_email: string
  expires_at: string
}

export interface ExternalShareVerifyResponse {
  view_url: string
}

export const ddmsExternalShareService = {
  /**
   * Validate share token and return OAuth provider info for the frontend
   */
  validate: (token: string) =>
    http.get(apiEndpoints.ddmsExternalShare.validate(token))
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as ExternalShareValidationResponse
      }),

  /**
   * Verify OAuth ID token and return a document view URL
   */
  verify: (token: string, body: VerifyShareBody) =>
    http.post(apiEndpoints.ddmsExternalShare.verify(token), body)
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as ExternalShareVerifyResponse
      }),
}

// ── DDMS Audit Logs service ──────────────────────────────────────────────────

export interface DDMSAuditLog {
  id: string
  issuer_id: string
  username: string
  action: string
  details: string
  created_at: string
}

export interface DDMSAuditLogsResponse {
  logs: DDMSAuditLog[]
  total: number
  page: number
  limit: number
}

export const ddmsAuditLogsService = {
  /**
   * List DDMS audit logs (admin only)
   */
  list: (params: ListAuditLogsParams) =>
    http.get(apiEndpoints.ddmsAuditLogs.list, { params })
      .then((r) => {
        const payload = r.data as any
        return (payload?.success ? payload.data : payload) as DDMSAuditLogsResponse
      }),
}
