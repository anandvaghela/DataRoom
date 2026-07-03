'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FolderOpen, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { getUser } from '@/lib/api'
import {
  useDDMSInvestorRoots,
  useDDMSInvestorFolderContents,
  useDDMSInvestorDocumentSearch,
} from '@/lib/hooks/useDDMS'
import FilePreviewModal from '@/components/files/FilePreviewModal'
import DetailsPanel from '@/components/files/DetailsPanel'
import Portal from '@/components/ui/Portal'
import { FileItem, User } from '@/types'
import { ddmsDocumentsService, ddmsInvestorService } from '@/lib/services/ddmsService'
import toast from 'react-hot-toast'

import FilesHeader from './FilesPage/FilesHeader'
import FilesGrid from './FilesPage/FilesGrid'
import FilesList from './FilesPage/FilesList'

const getId = (f: any) => f._id || f.id

const mapFolder = (f: any, parentOwner?: string, parentIssuerId?: string): FileItem => {
  const companyName = f.issuer?.company_legal_name || f.company_legal_name || f.owner || parentOwner
  const name = (f.is_root && companyName) ? companyName : f.name
  const issuerId = f.issuer_id || f.issuer?._id || parentIssuerId || null
  return {
    path: getId(f), name, isDir: true, size: f.size || 0,
    modified: f.updatedAt || f.createdAt || new Date().toISOString(),
    created: f.createdAt || null,
    type: 'directory',
    sharedBy: companyName || issuerId || 'System',
    owner: companyName || issuerId || 'System',
    canWrite: false,
    isRoot: f.is_root || false,
    rootType: f.root_type || null,
    issuerId
  }
}

const mapDocument = (d: any, parentOwner?: string, parentIssuerId?: string): FileItem => {
  const companyName = d.issuer?.company_legal_name || d.company_legal_name || d.owner || parentOwner
  const issuerId = d.issuer_id || d.issuer?._id || parentIssuerId || null
  return {
    path: getId(d), name: d.filename, isDir: false, size: d.size || 0,
    modified: d.updatedAt || d.createdAt || new Date().toISOString(),
    created: d.createdAt || null,
    type: d.mime_type?.includes('pdf') ? 'pdf' : d.mime_type?.includes('text') ? 'text' : 'file',
    mimeType: d.mime_type || 'application/octet-stream',
    sharedBy: companyName || issuerId || 'System',
    owner: companyName || issuerId || 'System',
    canWrite: false,
    issuerId
  }
}

export type SortByOption = 'name' | 'size' | 'modified'

function compareFiles(a: FileItem, b: FileItem, sortBy: SortByOption, sortAsc: boolean): number {
  if (sortBy === 'name') return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  if (sortBy === 'size') return sortAsc ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0)
  const da = a.modified ? new Date(a.modified).getTime() : 0
  const db = b.modified ? new Date(b.modified).getTime() : 0
  return sortAsc ? da - db : db - da
}

const getFolderOwner = (id: string, cache: Record<string, { name: string; parentId: string | null; owner?: string }>): string => {
  let curr = cache[id]
  while (curr) {
    if (curr.owner) return curr.owner
    if (!curr.parentId) break
    curr = cache[curr.parentId]
  }
  return 'System'
}

interface FilesPaneProps {
  loading: boolean
  viewMode: 'grid' | 'list'
  displayItems: FileItem[]
  searchQuery: string
  selected: Set<string>
  sortBy: SortByOption
  setSortBy: React.Dispatch<React.SetStateAction<SortByOption>>
  sortAsc: boolean
  setSortAsc: React.Dispatch<React.SetStateAction<boolean>>
  handleItemClick: (item: any, e: React.MouseEvent) => void
  navigate: (path: string) => void
  setPreviewTarget: (item: FileItem | null) => void
  isSearch?: boolean
}

function FilesPane({
  loading, viewMode, displayItems, searchQuery, selected,
  sortBy, setSortBy, sortAsc, setSortAsc, handleItemClick, navigate,
  setPreviewTarget, isSearch
}: Readonly<FilesPaneProps>) {
  if (loading) {
    return (
      <div className={clsx('gap-2 sm:gap-3', viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'flex flex-col')}>
        {Array.from({ length: 12 }).map((_, i) => <div key={i} className={clsx('bg-white rounded-xl border border-[#e8eaed] animate-pulse', viewMode === 'grid' ? 'h-20' : 'h-12')} />)}
      </div>
    )
  }
  if (displayItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <FolderOpen className="w-16 h-16 mb-4 opacity-30 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">{searchQuery ? 'No results found' : 'This folder is empty'}</p>
      </div>
    )
  }
  const folders = displayItems.filter(i => i.isDir)
  const files = displayItems.filter(i => !i.isDir)
  return viewMode === 'list' ? (
    <FilesList
      folders={folders} files={files} selected={selected} sortBy={sortBy} setSortBy={setSortBy} sortAsc={sortAsc} setSortAsc={setSortAsc}
      handleItemClick={handleItemClick} navigate={navigate} setPreviewTarget={setPreviewTarget} handleContextMenu={() => {}}
      isInvestor={true} isSearch={isSearch}
    />
  ) : (
    <FilesGrid
      folders={folders} files={files} selected={selected} handleItemClick={handleItemClick} navigate={navigate} setPreviewTarget={setPreviewTarget}
      handleContextMenu={() => {}}
      isInvestor={true} isSearch={isSearch}
    />
  )
}

// Custom hook to debounce state/search query
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function InvestorFilesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState(searchParams.get('path') || '/')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortByOption>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.replace('/login')
      return
    }
    if (u.scope !== 'investor') {
      router.replace('/dashboard/files')
      return
    }
    setUser(u)
  }, [router])

  const issuerId = (user as any)?.issuerId || (user as any)?.issuer_id || '6a142d3460f222865a432a1b'

  // Queries
  const { data: investorRoots, isLoading: loadingInvRoots } = useDDMSInvestorRoots(!!user && currentPath === '/')
  const { data: investorContents, isLoading: loadingInvContents } = useDDMSInvestorFolderContents(currentPath, !!user && currentPath !== '/' && !!currentPath)

  const currentContents = investorContents

  // Search (debounced)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const searchInvResults = useDDMSInvestorDocumentSearch(debouncedSearchQuery, issuerId, !!user && !!debouncedSearchQuery.trim()).data

  // Global listener for search bar queries
  useEffect(() => {
    const updateSearch = (e: Event) => {
      const q = (e as CustomEvent).detail ?? (globalThis.window as any).__searchQuery ?? ''
      setSearchQuery(q)
    }
    globalThis.window?.addEventListener('global-search', updateSearch)
    if (globalThis.window !== undefined) {
      const q = (globalThis.window as any).__searchQuery
      if (q !== undefined && q !== null) setSearchQuery(q)
    }
    return () => globalThis.window?.removeEventListener('global-search', updateSearch)
  }, [])

  const [folderCache, setFolderCache] = useState<Record<string, { name: string; parentId: string | null; owner?: string }>>({})

  // Update cache with investor roots
  useEffect(() => {
    const rootsArray = Array.isArray(investorRoots)
      ? investorRoots
      : (investorRoots && typeof investorRoots === 'object' && 'folders' in (investorRoots as any) && Array.isArray((investorRoots as any).folders)
          ? (investorRoots as any).folders
          : (investorRoots && typeof investorRoots === 'object' && 'data' in (investorRoots as any) && Array.isArray((investorRoots as any).data)
              ? (investorRoots as any).data
              : []))
    if (rootsArray.length === 0) return
    setFolderCache(prev => {
      const next = { ...prev }
      let changed = false
      for (const r of rootsArray) {
        const id = (r as any)._id || (r as any).id
        const companyName = r.issuer?.company_legal_name || r.company_legal_name || r.owner
        const name = (r.is_root && companyName) ? companyName : r.name
        if (id && (!next[id] || next[id].name !== name)) {
          next[id] = { name, parentId: null, owner: companyName }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [investorRoots])

  // Update cache with subfolders and current folder when contents are loaded
  useEffect(() => {
    const contents = investorContents
    if (!contents) return
    setFolderCache(prev => {
      const next = { ...prev }
      let changed = false

      if (contents.folder) {
        const f = contents.folder as any
        const id = f._id || f.id
        const parentId = f.parent_id || null
        const companyName = f.issuer?.company_legal_name || f.company_legal_name || f.owner
        const name = (f.is_root && companyName) ? companyName : f.name
        if (id && (!next[id] || next[id].name !== name)) {
          next[id] = { name, parentId, owner: companyName }
          changed = true
        }
      }

      for (const f of (contents.folders || []) as any[]) {
        const id = f._id || f.id
        const parentId = f.parent_id || null
        const companyName = f.issuer?.company_legal_name || f.company_legal_name || f.owner
        const name = (f.is_root && companyName) ? companyName : f.name
        if (id && (!next[id] || next[id].name !== name)) {
          next[id] = { name, parentId, owner: companyName }
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [investorContents])

  const items = useMemo(() => {
    if (searchQuery.trim()) {
      // Extract folders and documents from the API response
      let apiFolders: any[] = []
      let apiDocs: any[] = []

      if (Array.isArray(searchInvResults)) {
        apiDocs = searchInvResults
      } else if (searchInvResults && typeof searchInvResults === 'object') {
        const res = searchInvResults as any
        if (Array.isArray(res.folders)) apiFolders = res.folders
        if (Array.isArray(res.documents)) apiDocs = res.documents
        if (!apiFolders.length && !apiDocs.length && Array.isArray(res.data)) {
          apiDocs = res.data
        }
      }

      // Map API folders to FileItems
      const mappedApiFolders: FileItem[] = apiFolders.map(f => {
        const folderOwner = f.issuer?.company_legal_name || f.company_legal_name || f.owner
        return mapFolder(f, folderOwner)
      })

      // Map API documents to FileItems
      const mappedDocs = apiDocs.map(d => {
        const ownerName = d.folder_id ? getFolderOwner(d.folder_id, folderCache) : undefined
        return mapDocument(d, ownerName)
      })

      // Local folder search from cache (supplement API results)
      const query = searchQuery.trim().toLowerCase()
      const matchingFolders: FileItem[] = [...mappedApiFolders]
      if (query) {
        Object.entries(folderCache).forEach(([id, info]) => {
          if (id !== '/' && info.name.toLowerCase().includes(query)) {
            if (!matchingFolders.some(f => f.path === id)) {
              const ownerName = getFolderOwner(id, folderCache)
              matchingFolders.push({
                path: id,
                name: info.name,
                isDir: true,
                size: 0,
                modified: new Date().toISOString(),
                created: null,
                type: 'directory',
                sharedBy: ownerName,
                owner: ownerName,
                canWrite: false
              })
            }
          }
        })
      }

      return [...matchingFolders, ...mappedDocs]
    }

    if (currentPath === '/') {
      if (!investorRoots) return []
      const rootsArray = Array.isArray(investorRoots)
        ? investorRoots
        : (investorRoots && typeof investorRoots === 'object' && 'folders' in (investorRoots as any) && Array.isArray((investorRoots as any).folders)
            ? (investorRoots as any).folders
            : (investorRoots && typeof investorRoots === 'object' && 'data' in (investorRoots as any) && Array.isArray((investorRoots as any).data)
                ? (investorRoots as any).data
                : []))
      return rootsArray.map((f: any) => mapFolder(f))
    } else {
      if (!currentContents) return []
      const folder = (currentContents as any).folder
      const parentOwner = folder?.issuer?.company_legal_name || folder?.company_legal_name || folder?.owner
      const parentIssuerId = folder?.issuer_id || folder?.issuer?._id
      const folders = Array.isArray(currentContents.folders) ? currentContents.folders : []
      const documents = Array.isArray(currentContents.documents) ? currentContents.documents : []
      return [
        ...folders.map((f: any) => mapFolder(f, parentOwner, parentIssuerId)),
        ...documents.map((d: any) => mapDocument(d, parentOwner, parentIssuerId))
      ]
    }
  }, [searchQuery, currentPath, investorRoots, currentContents, searchInvResults, folderCache])

  const loading = searchQuery.trim() ? false : (currentPath === '/' ? loadingInvRoots : loadingInvContents)

  const navigate = useCallback((path: string) => {
    setSelected(new Set())
    setSearchQuery('')
    if (globalThis.window) {
      (globalThis.window as any).__searchQuery = ''
      globalThis.window.dispatchEvent(new CustomEvent('global-search', { detail: '' }))
    }
    setCurrentPath(path)
    const params = new URLSearchParams(window.location.search)
    params.set('path', path)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }, [router])

  const handleDownload = async (file: FileItem) => {
    try {
      const isUserInvestor = user?.scope === 'investor'
      const res = isUserInvestor
        ? await ddmsInvestorService.getDocumentUrl(file.path)
        : await ddmsDocumentsService.getUrl(file.path)
      
      if (res?.url) {
        const a = document.createElement('a')
        a.href = res.url
        a.download = file.name
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        toast.error('Failed to get download URL')
      }
    } catch (err: any) {
      toast.error('Failed to download file')
      console.error(err)
    }
  }

  // Click handler
  const handleItemClick = (item: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set<string>()
      if (!prev.has(item.path)) {
        next.add(item.path)
      }
      return next
    })
  }

  // Double click or enter key to preview/navigate
  const selectedItems = useMemo(() => items.filter((i: any) => selected.has(i.path)), [items, selected])
  const activeSidebarItem = selectedItems.length === 1 ? selectedItems[0] : null

  // Breadcrumbs
  const breadcrumb = useMemo(() => {
    if (currentPath === '/') {
      return [{ label: 'Home', path: '/' }]
    }

    const trail: { label: string; path: string }[] = []
    let currId = currentPath
    while (currId && currId !== '/') {
      const cached = folderCache[currId]
      if (cached) {
        trail.unshift({ label: cached.name, path: currId })
        currId = cached.parentId || ''
      } else {
        // Fallback if not cached yet
        trail.unshift({ label: currId, path: currId })
        break
      }
    }

    return [{ label: 'Home', path: '/' }, ...trail]
  }, [currentPath, folderCache])

  const currentFolderOwner = useMemo(() => {
    if (currentPath === '/') return 'System'
    return folderCache[currentPath]?.owner || getFolderOwner(currentPath, folderCache) || 'System'
  }, [currentPath, folderCache])

  // Sorting
  const displayItems = useMemo(() => {
    return [...items].sort((a, b) => compareFiles(a, b, sortBy, sortAsc))
  }, [items, sortBy, sortAsc])

  return (
    <div className="flex flex-1 overflow-hidden bg-[#fafafa]">
      <div className="flex-1 flex flex-col min-w-0 relative">
        <FilesHeader breadcrumb={breadcrumb} onNavigate={navigate} viewMode={viewMode} setViewMode={setViewMode} />

        <div className="flex-1 overflow-auto p-3 sm:p-6" onClick={() => setSelected(new Set())}>
          <FilesPane
            loading={loading} viewMode={viewMode} displayItems={displayItems} searchQuery={searchQuery}
            selected={selected} sortBy={sortBy} setSortBy={setSortBy} sortAsc={sortAsc}
            setSortAsc={setSortAsc} handleItemClick={handleItemClick} navigate={navigate} setPreviewTarget={setPreviewTarget}
            isSearch={!!searchQuery}
          />
        </div>

        <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
          <Users className="w-3.5 h-3.5 flex-shrink-0" /><span>Viewing shared folder (Read only)</span>
        </div>

        <Portal>
          {previewTarget && (
            <FilePreviewModal
              file={previewTarget} isSharedContext={true} onClose={() => setPreviewTarget(null)} onDownload={() => handleDownload(previewTarget)}
            />
          )}
        </Portal>
      </div>

      <DetailsPanel
        currentPath={currentPath}
        currentFolderName={breadcrumb[breadcrumb.length - 1]?.label}
        currentFolder={(currentContents as any)?.folder}
        currentFolderOwner={currentFolderOwner}
        items={items}
        selectedItem={selectedItems.length === 1 ? selectedItems[0] : null}
        onNavigate={navigate} onClearSelection={() => setSelected(new Set())}
        onDownload={activeSidebarItem && !activeSidebarItem.isDir ? () => handleDownload(activeSidebarItem) : undefined}
      />
    </div>
  )
}
