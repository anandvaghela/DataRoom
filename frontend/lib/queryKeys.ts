// Centralised query keys — keeps cache invalidation consistent across the app
export const queryKeys = {
  // ── DDMS — Folders ─────────────────────────────────────────────────────────
  ddmsFolders: {
    all: ['ddmsFolders'] as const,
    roots: () => ['ddmsFolders', 'roots'] as const,
    tree: () => ['ddmsFolders', 'tree'] as const,
    contents: (id: string) => ['ddmsFolders', 'contents', id] as const,
  },

  // ── DDMS — Documents ───────────────────────────────────────────────────────
  ddmsDocuments: {
    all: ['ddmsDocuments'] as const,
    search: (q: string, issuerId?: string) =>
      ['ddmsDocuments', 'search', q, issuerId] as const,
    url: (id: string) => ['ddmsDocuments', 'url', id] as const,
  },

  // ── DDMS — Investor (permission-scoped) ────────────────────────────────────
  ddmsInvestor: {
    all: ['ddmsInvestor'] as const,
    roots: () => ['ddmsInvestor', 'roots'] as const,
    tree: (id: string) => ['ddmsInvestor', 'tree', id] as const,
    issuerRoots: (issuerId: string) =>
      ['ddmsInvestor', 'roots', issuerId] as const,
    folderContents: (id: string) =>
      ['ddmsInvestor', 'folder', id] as const,
    searchDocuments: (q: string, issuerId?: string) =>
      ['ddmsInvestor', 'search', q, issuerId] as const,
    documentUrl: (id: string) =>
      ['ddmsInvestor', 'url', id] as const,
  },
}
