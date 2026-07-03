const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://filebrowser-server.onrender.com'

export const BASE_URL = `${API_URL}/api`

export const apiEndpoints = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  auth: {
    issuerLogin: '/ubverse-service/issuer/login',
    issuerLogout: '/ubverse-service/issuer/logout',
    investorLogin: '/user-service/user/login',
    renew: '/renew',
  },

  // ── DDMS — Folders ─────────────────────────────────────────────────────────
  ddmsFolders: {
    roots: '/ubverse-service/ddms/folders/roots',
    tree: '/ubverse-service/ddms/folders/tree',
    contents: (id: string) => `/ubverse-service/ddms/folders/${id}/contents`,
    create: '/ubverse-service/ddms/folders',
    rename: (id: string) => `/ubverse-service/ddms/folders/${id}`,
    delete: (id: string) => `/ubverse-service/ddms/folders/${id}`,
    move: (id: string) => `/ubverse-service/ddms/folders/${id}/move`,
    copy: (id: string) => `/ubverse-service/ddms/folders/${id}/copy`,
    investors: '/ubverse-service/ddms/folders/investors',
  },

  // ── DDMS — Documents ───────────────────────────────────────────────────────
  ddmsDocuments: {
    upload: '/ubverse-service/ddms/documents/upload',
    search: '/ubverse-service/ddms/documents/search',
    url: (id: string) => `/ubverse-service/ddms/documents/${id}/url`,
    rename: (id: string) => `/ubverse-service/ddms/documents/${id}`,
    delete: (id: string) => `/ubverse-service/ddms/documents/${id}`,
    move: (id: string) => `/ubverse-service/ddms/documents/${id}/move`,
    copy: (id: string) => `/ubverse-service/ddms/documents/${id}/copy`,
  },

  // ── DDMS — Permissions ─────────────────────────────────────────────────────
  ddmsPermissions: {
    grant: '/ubverse-service/ddms/permissions',
    revoke: (id: string) => `/ubverse-service/ddms/permissions/${id}`,
  },

  // ── DDMS — Investor (permission-scoped) ────────────────────────────────────
  ddmsInvestor: {
    roots: '/ubverse-service/ddms/investor/folders/roots',
    tree: (id: string) => `/ubverse-service/ddms/investor/tree/${id}`,
    issuerRoots: (issuerId: string) =>
      `/ubverse-service/ddms/investor/issuers/${issuerId}/folders/roots`,
    folderContents: (id: string) =>
      `/ubverse-service/ddms/investor/folders/${id}/contents`,
    searchDocuments: '/ubverse-service/ddms/investor/documents/search',
    documentUrl: (id: string) =>
      `/ubverse-service/ddms/investor/documents/${id}/url`,
  },

  // ── DDMS — Share Tokens ──────────────────────────────────────────────────
  ddmsShareTokens: {
    create: '/ubverse-service/ddms/share-tokens',
    revoke: (id: string) => `/ubverse-service/ddms/share-tokens/${id}`,
  },

  // ── DDMS — External Share ────────────────────────────────────────────────
  ddmsExternalShare: {
    validate: (token: string) => `/ubverse-service/ddms/share/${token}`,
    verify: (token: string) => `/ubverse-service/ddms/share/${token}/verify`,
  },

  // ── DDMS — Audit Logs ────────────────────────────────────────────────────
  ddmsAuditLogs: {
    list: '/ubverse-service/ddms/audit-logs',
  },
}
