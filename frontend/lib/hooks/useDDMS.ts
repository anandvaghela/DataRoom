import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import {
  ddmsFoldersService,
  ddmsDocumentsService,
  ddmsPermissionsService,
  ddmsInvestorService,
  CreateFolderBody,
  RenameFolderBody,
  MoveFolderBody,
  CopyFolderBody,
  RenameDocumentBody,
  MoveDocumentBody,
  CopyDocumentBody,
  GrantPermissionBody,
} from '../services/ddmsService'

// ═══════════════════════════════════════════════════════════════════════════════
// DDMS — Folders
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get full nested folder tree with documents for the authenticated issuer
 */
export function useDDMSFolderTree(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsFolders.tree(),
    queryFn: () => ddmsFoldersService.getTree(),
    enabled,
  })
}

/**
 * List provisioned root folders for the authenticated issuer
 */
export function useDDMSRoots(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsFolders.roots(),
    queryFn: () => ddmsFoldersService.getRoots(),
    enabled,
  })
}

/**
 * Get all investors for admin panel
 */
export function useDDMSInvestors() {
  return useQuery({
    queryKey: ['ddms', 'investors'],
    queryFn: () => ddmsFoldersService.getInvestors(),
  })
}

/**
 * List subfolders and documents inside a folder
 */
export function useDDMSFolderContents(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsFolders.contents(id),
    queryFn: () => ddmsFoldersService.getContents(id),
    enabled: enabled && !!id,
  })
}

/**
 * Create a sub-folder inside an issuer directory tree
 */
export function useCreateDDMSFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateFolderBody) => ddmsFoldersService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Rename a folder
 */
export function useRenameDDMSFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RenameFolderBody }) =>
      ddmsFoldersService.rename(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Delete a folder recursively
 */
export function useDeleteDDMSFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ddmsFoldersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Move a folder to a new parent
 */
export function useMoveDDMSFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MoveFolderBody }) =>
      ddmsFoldersService.move(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Copy a folder recursively
 */
export function useCopyDDMSFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CopyFolderBody }) =>
      ddmsFoldersService.copy(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DDMS — Documents
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search documents by filename (issuer-scoped)
 */
export function useDDMSDocumentSearch(q: string, issuerId?: string, enabled = true) {
  const {data}= useQuery({
    queryKey: queryKeys.ddmsDocuments.search(q, issuerId),
    queryFn: () => ddmsDocumentsService.search(q, issuerId),
    enabled: enabled && !!q,
  })
  return data
}

/**
 * Get a short-lived pre-signed GET URL for a document
 */
export function useDDMSDocumentUrl(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsDocuments.url(id),
    queryFn: () => ddmsDocumentsService.getUrl(id),
    enabled: enabled && !!id,
    // URLs expire — don't cache for too long
    staleTime: 60 * 1000,
    gcTime: 90 * 1000,
  })
}

/**
 * Upload a document to a folder.
 * Handles presign + S3 PUT in one mutation.
 * Pass `onProgress` via variables for per-file progress tracking.
 */
export function useUploadDDMSDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      folderId,
      file,
      onProgress,
    }: {
      folderId: string
      file: File
      onProgress?: (percent: number) => void
    }) => ddmsDocumentsService.upload(folderId, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Rename a document
 */
export function useRenameDDMSDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RenameDocumentBody }) =>
      ddmsDocumentsService.rename(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsDocuments.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Soft-delete a document
 */
export function useDeleteDDMSDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ddmsDocumentsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsDocuments.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Move a document to another folder
 */
export function useMoveDDMSDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MoveDocumentBody }) =>
      ddmsDocumentsService.move(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Copy a document to a folder
 */
export function useCopyDDMSDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CopyDocumentBody }) =>
      ddmsDocumentsService.copy(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsFolders.all })
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DDMS — Permissions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Grant investor view access to a private folder or document
 */
export function useGrantDDMSPermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GrantPermissionBody) =>
      ddmsPermissionsService.grant(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

/**
 * Revoke investor access
 */
export function useRevokeDDMSPermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ddmsPermissionsService.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ddmsInvestor.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DDMS — Investor (permission-scoped)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List public root folders for all issuers plus private roots where investor NDA is signed
 */
export function useDDMSInvestorRoots(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsInvestor.roots(),
    queryFn: () => ddmsInvestorService.getRoots(),
    enabled,
  })
}

/**
 * Get full nested folder tree with documents for the authenticated investor by issuer id
 */
export function useDDMSInvestorTree(issuerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsInvestor.tree(issuerId),
    queryFn: () => ddmsInvestorService.getTree(issuerId),
    enabled: enabled && !!issuerId,
  })
}

/**
 * List issuer root folders visible to the investor
 */
export function useDDMSInvestorIssuerRoots(issuerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsInvestor.issuerRoots(issuerId),
    queryFn: () => ddmsInvestorService.getIssuerRoots(issuerId),
    enabled: enabled && !!issuerId,
  })
}

/**
 * List folder contents for investor (permission-scoped)
 */
export function useDDMSInvestorFolderContents(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsInvestor.folderContents(id),
    queryFn: () => ddmsInvestorService.getFolderContents(id),
    enabled: enabled && !!id,
  })
}

/**
 * Search documents for investor (permission-scoped)
 */
export function useDDMSInvestorDocumentSearch(
  q: string,
  issuerId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.ddmsInvestor.searchDocuments(q, issuerId),
    queryFn: () => ddmsInvestorService.searchDocuments(q, issuerId),
    enabled: enabled && !!q,
  })
}

/**
 * Get document view URL for investor (permission-scoped)
 */
export function useDDMSInvestorDocumentUrl(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ddmsInvestor.documentUrl(id),
    queryFn: () => ddmsInvestorService.getDocumentUrl(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
    gcTime: 90 * 1000,
  })
}
