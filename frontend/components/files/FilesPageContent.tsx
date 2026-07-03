'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FolderOpen, Upload, FolderPlus } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { getUser } from '@/lib/api'
import {
  useDDMSRoots, useDDMSFolderContents,
  useUploadDDMSDocument,
  useDeleteDDMSFolder, useDeleteDDMSDocument,
  useDDMSDocumentSearch,
} from '@/lib/hooks/useDDMS'
import ShareModal from '@/components/files/ShareModal'
import RenameModal from '@/components/files/RenameModal'
import NewFolderModal from '@/components/files/NewFolderModal'
import DeleteConfirm from '@/components/files/DeleteConfirm'
import FilePreviewModal from '@/components/files/FilePreviewModal'
import MoveCopyModal from '@/components/files/MoveCopyModal'
import ShareWithUsersModal from '@/components/files/ShareWithUsersModal'
import DetailsPanel from '@/components/files/DetailsPanel'
import Portal from '@/components/ui/Portal'
import { FileItem, User } from '@/types'

import FilesHeader from './FilesPage/FilesHeader'
import FilesGrid from './FilesPage/FilesGrid'
import FilesList from './FilesPage/FilesList'
import UploadProgress from './FilesPage/UploadProgress'
import ContextMenu from './FilesPage/ContextMenu'

const getId = (f: any) => f._id || f.id

const mapFolder = (f: any, isInv: boolean): FileItem => ({
  path: getId(f), name: f.name, isDir: true, size: f.size || 0,
  modified: f.updatedAt || f.createdAt || new Date().toISOString(),
  created: f.createdAt || null,
  type: 'directory', sharedBy: f.issuer_id || 'System', canWrite: !isInv
})

const mapDocument = (d: any, isInv: boolean): FileItem => ({
  path: getId(d), name: d.filename, isDir: false, size: d.size || 0,
  modified: d.updatedAt || d.createdAt || new Date().toISOString(),
  created: d.createdAt || null,
  type: d.mimetype?.split('/')[0] || 'file', sharedBy: d.issuer_id || 'System', canWrite: !isInv
})

export type SortByOption = 'name' | 'size' | 'modified'

function compareFiles(a: FileItem, b: FileItem, sortBy: SortByOption, sortAsc: boolean): number {
  if (sortBy === 'name') return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  if (sortBy === 'size') return sortAsc ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0)
  const da = a.modified ? new Date(a.modified).getTime() : 0
  const db = b.modified ? new Date(b.modified).getTime() : 0
  return sortAsc ? da - db : db - da
}

async function uploadSingleFile(
  file: File,
  currentPath: string,
  mutateAsync: any,
  setUploading: React.Dispatch<React.SetStateAction<Record<string, number>>>
) {
  const filename = file.name
  try {
    setUploading(prev => ({ ...prev, [filename]: 0 }))
    await mutateAsync({
      folderId: currentPath,
      file,
      onProgress: (p: number) => setUploading(prev => ({ ...prev, [filename]: p }))
    })
    toast.success(`${filename} uploaded successfully!`)
  } catch (err: any) {
    toast.error(`Upload failed for ${filename}: ${err.message}`)
  } finally {
    setUploading(prev => {
      const copy = { ...prev }
      delete copy[filename]
      return copy
    })
  }
}

async function deleteSingleItem(item: FileItem, deleteFolder: any, deleteDoc: any) {
  try {
    if (item.isDir) await deleteFolder(item.path)
    else await deleteDoc(item.path)
  } catch (err: any) {
    toast.error(`Failed to delete ${item.name}: ${err.message}`)
  }
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
  handleContextMenu: (e: React.MouseEvent, item: any) => void
  hideMoreOptions?: boolean
}

function FilesPane({
  loading, viewMode, displayItems, searchQuery, selected,
  sortBy, setSortBy, sortAsc, setSortAsc, handleItemClick, navigate,
  setPreviewTarget, handleContextMenu, hideMoreOptions
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
        {!searchQuery && <p className="text-sm mt-1">Drop files here or click + icon</p>}
      </div>
    )
  }
  const folders = displayItems.filter(i => i.isDir)
  const files = displayItems.filter(i => !i.isDir)
  return viewMode === 'list' ? (
    <FilesList
      folders={folders} files={files} selected={selected} sortBy={sortBy} setSortBy={setSortBy} sortAsc={sortAsc} setSortAsc={setSortAsc}
      handleItemClick={handleItemClick} navigate={navigate} setPreviewTarget={setPreviewTarget} handleContextMenu={handleContextMenu}
      isInvestor={false} hideMoreOptions={hideMoreOptions}
    />
  ) : (
    <FilesGrid
      folders={folders} files={files} selected={selected} handleItemClick={handleItemClick} navigate={navigate} setPreviewTarget={setPreviewTarget}
      handleContextMenu={handleContextMenu}
      isInvestor={false} hideMoreOptions={hideMoreOptions}
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

export default function FilesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState(searchParams.get('path') || '/')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortByOption>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [uploading, setUploading] = useState<Record<string, number>>({})
  const [user, setUser] = useState<User | null>(null)

  // Modals & Menu
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null)
  const [shareWithUsersTarget, setShareWithUsersTarget] = useState<FileItem | null>(null)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [deleteTargets, setDeleteTargets] = useState<FileItem[]>([])
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null)
  const [moveCopyTargets, setMoveCopyTargets] = useState<FileItem[] | null>(null)
  const [moveCopyAction, setMoveCopyAction] = useState<'copy' | 'move' | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FileItem } | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.replace('/login')
      return
    }
    if (u.scope === 'investor') {
      router.replace('/dashboard/investor')
      return
    }
    setUser(u)
  }, [router])

  useEffect(() => {
    const cb = () => { setContextMenu(null); setFabOpen(false) }
    globalThis.window?.addEventListener('click', cb)
    return () => globalThis.window?.removeEventListener('click', cb)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault(); e.stopPropagation()
    if (currentPath === '/' && !searchQuery) return
    if (!selected.has(item.path)) setSelected(new Set([item.path]))
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  // Queries
  const { data: issuerRoots, isLoading: loadingRoots } = useDDMSRoots(!!user)
  const { data: issuerContents, isLoading: loadingContents, error: contentsError } = useDDMSFolderContents(currentPath, !!user && currentPath !== '/' && !!currentPath)

  const currentContents = issuerContents

  useEffect(() => {
    if (contentsError) console.error('[DDMS] folder contents error:', contentsError)
    if (issuerContents) console.log('[DDMS] folder contents:', issuerContents)
  }, [issuerContents, contentsError])

  // Search (debounced)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const searchIssuerResults = useDDMSDocumentSearch(debouncedSearchQuery, undefined, !!user && !!debouncedSearchQuery.trim())

  const loading = currentPath === '/' ? loadingRoots : loadingContents

  const items = useMemo(() => {
    if (currentPath === '/') {
      const rootsArray = Array.isArray(issuerRoots) ? issuerRoots : []
      return rootsArray.map((f: any) => mapFolder(f, false))
    }
    return [
      ...(currentContents?.folders || []).map(f => mapFolder(f, false)),
      ...(currentContents?.documents || []).map(d => mapDocument(d, false))
    ]
  }, [currentPath, issuerRoots, currentContents])

  const [folderCache, setFolderCache] = useState<Record<string, { name: string; parentId: string | null }>>({})

  const searchResults = useMemo(() => {
    const docs = (searchIssuerResults || []).map(d => mapDocument(d, false))
    
    // Local folder search from cache
    const query = searchQuery.trim().toLowerCase()
    const matchingFolders: FileItem[] = []
    if (query) {
      Object.entries(folderCache).forEach(([id, info]) => {
        if (id !== '/' && info.name.toLowerCase().includes(query)) {
          if (!matchingFolders.some(f => f.path === id)) {
            matchingFolders.push({
              path: id,
              name: info.name,
              isDir: true,
              size: 0,
              modified: new Date().toISOString(),
              created: null,
              type: 'directory',
              sharedBy: 'System',
              canWrite: true
            })
          }
        }
      })
    }

    return [...matchingFolders, ...docs]
  }, [searchIssuerResults, searchQuery, folderCache])

  // Update cache with roots
  useEffect(() => {
    const rootsArray = Array.isArray(issuerRoots) ? issuerRoots : []
    if (rootsArray.length === 0) return
    setFolderCache(prev => {
      const next = { ...prev }
      let changed = false
      for (const r of rootsArray) {
        const id = (r as any)._id || (r as any).id
        if (id && (!next[id] || next[id].name !== r.name)) {
          next[id] = { name: r.name, parentId: null }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [issuerRoots])

  // Update cache with subfolders and current folder when contents are loaded
  useEffect(() => {
    const contents = issuerContents
    if (!contents) return
    setFolderCache(prev => {
      const next = { ...prev }
      let changed = false

      // Current folder from the response — this gives us the name for the breadcrumb
      if (contents.folder) {
        const f = contents.folder as any
        const id = f._id || f.id
        const parentId = f.parent_id || null
        if (id && (!next[id] || next[id].name !== f.name)) {
          next[id] = { name: f.name, parentId }
          changed = true
        }
      }

      // Subfolders
      for (const f of (contents.folders || []) as any[]) {
        const id = f._id || f.id
        const parentId = f.parent_id || null
        if (id && (!next[id] || next[id].name !== f.name)) {
          next[id] = { name: f.name, parentId }
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [issuerContents])

  const navigate = (path: string) => router.push(`/dashboard/files?path=${encodeURIComponent(path)}`)
  useEffect(() => { setCurrentPath(searchParams.get('path') || '/') }, [searchParams])

  // Dropzone upload
  const uploadDoc = useUploadDDMSDocument()
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (currentPath === '/') { toast.error('Please open a folder before uploading'); return }
    for (const file of acceptedFiles) {
      await uploadSingleFile(file, currentPath, uploadDoc.mutateAsync, setUploading)
    }
  }, [currentPath, uploadDoc.mutateAsync])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: true, noKeyboard: true })

  useEffect(() => {
    const handleNewFolder = () => setShowNewFolder(true)
    const handleUpload = () => open()
    globalThis.window?.addEventListener('sidebar-new-folder', handleNewFolder)
    globalThis.window?.addEventListener('sidebar-upload', handleUpload)
    return () => {
      globalThis.window?.removeEventListener('sidebar-new-folder', handleNewFolder)
      globalThis.window?.removeEventListener('sidebar-upload', handleUpload)
    }
  }, [open])

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const q = (globalThis.window as any).__searchQuery
      if (q !== undefined && q !== null) setSearchQuery(q)
      const handleGlobalSearch = (e: Event) => setSearchQuery((e as CustomEvent).detail ?? '')
      globalThis.window.addEventListener('global-search', handleGlobalSearch)
      return () => globalThis.window?.removeEventListener('global-search', handleGlobalSearch)
    }
  }, [])

  const currentFolderName = useMemo(() => {
    if (currentPath === '/') return 'Home'
    return folderCache[currentPath]?.name || currentContents?.folder?.name || ''
  }, [currentPath, folderCache, currentContents])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => compareFiles(a, b, sortBy, sortAsc))
  }, [items, sortBy, sortAsc])

  const displayItems = searchQuery ? searchResults : sortedItems
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

  const handleItemClick = (item: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.detail === 2) return // ignore clicks that are part of a double-click
    if (e.ctrlKey || e.metaKey) {
      setSelected(prev => {
        const n = new Set(prev)
        n.has(item.path) ? n.delete(item.path) : n.add(item.path)
        return n
      })
    } else {
      setSelected(prev => prev.has(item.path) ? new Set() : new Set([item.path]))
    }
  }

  const deleteFolder = useDeleteDDMSFolder()
  const deleteDoc = useDeleteDDMSDocument()

  const handleDelete = async (targets: any[]) => {
    for (const t of targets) {
      await deleteSingleItem(t, deleteFolder.mutateAsync, deleteDoc.mutateAsync)
    }
    toast.success(`Deleted ${targets.length} item${targets.length > 1 ? 's' : ''}`)
    setDeleteTargets([]); setSelected(new Set())
  }

  const selectedItems = displayItems.filter((i: any) => selected.has(i.path))
  const activeSidebarItem = useMemo(() => {
    if (selectedItems.length === 1) return selectedItems[0]
    if (selectedItems.length === 0 && currentPath !== '/') {
      const folderSize = currentContents?.folder?.size || 0
      return { name: currentPath.split('/').filter(Boolean).pop() || 'Home', path: currentPath, isDir: true, size: folderSize } as FileItem
    }
    return null
  }, [selectedItems, currentPath, currentContents])

  const isPrivateRootActive = useMemo(() => {
    if (!activeSidebarItem) return false
    
    if (activeSidebarItem.isDir) {
      if (activeSidebarItem.name.toLowerCase() === 'private') {
        return true
      }
      const cached = folderCache[activeSidebarItem.path]
      if (cached && (!cached.parentId || cached.parentId === '/')) {
        return cached.name.toLowerCase() === 'private'
      }
    }
    
    const targetId = activeSidebarItem.isDir ? activeSidebarItem.path : currentPath
    let currId = targetId
    for (let depth = 0; depth < 20; depth++) {
      if (!currId || currId === '/') break
      const cached = folderCache[currId]
      if (cached) {
        if (!cached.parentId || cached.parentId === '/') {
          return cached.name.toLowerCase() === 'private'
        }
        currId = cached.parentId
      } else {
        break
      }
    }
    return false
  }, [activeSidebarItem, currentPath, folderCache])

  return (
    <div className="flex h-full animate-fade-in" {...getRootProps()}>
      <input {...getInputProps()} />
      <div className="flex flex-col flex-1 min-w-0 bg-[#f8f9fb] relative">
        {isDragActive && (
          <div className="absolute inset-0 z-50 bg-primary-500/10 border-2 border-dashed border-primary-500 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-soft px-8 py-6 flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-primary-500" />
              <p className="font-semibold text-gray-900">Drop to upload</p>
            </div>
          </div>
        )}

        <FilesHeader breadcrumb={breadcrumb} onNavigate={navigate} viewMode={viewMode} setViewMode={setViewMode} />
        <UploadProgress uploading={uploading} />

        <div className="flex-1 overflow-auto p-3 sm:p-6" onClick={() => setSelected(new Set())}>
          <FilesPane
            loading={loading} viewMode={viewMode} displayItems={displayItems} searchQuery={searchQuery}
            selected={selected} sortBy={sortBy} setSortBy={setSortBy} sortAsc={sortAsc}
            setSortAsc={setSortAsc} handleItemClick={handleItemClick} navigate={navigate} setPreviewTarget={setPreviewTarget}
            handleContextMenu={handleContextMenu}
            hideMoreOptions={currentPath === '/' && !searchQuery}
          />
        </div>

        <div className="fixed bottom-20 sm:bottom-8 z-40 flex flex-col items-end gap-2 right-4 lg:right-[320px] xl:right-[350px]">
          <div className={clsx("flex flex-col items-end gap-2 transition-all duration-205", fabOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none")}>
            <button onClick={(e) => { e.stopPropagation(); open(); setFabOpen(false) }} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-xs font-bold rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <Upload className="w-3.5 h-3.5" />New File
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowNewFolder(true); setFabOpen(false) }} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-xs font-bold rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <FolderPlus className="w-3.5 h-3.5" />New Folder
            </button>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setFabOpen(prev => !prev) }} className="w-11 h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors focus:outline-none">
            <FolderPlus className="w-4.5 h-4.5" />
          </button>
        </div>

        <Portal>
          {shareTarget && <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />}
          {renameTarget && <RenameModal file={renameTarget} currentPath={currentPath} onClose={() => setRenameTarget(null)} onDone={() => setRenameTarget(null)} />}
          {showNewFolder && <NewFolderModal currentPath={currentPath} onClose={() => setShowNewFolder(false)} onDone={() => setShowNewFolder(false)} user={user} isSharedContext={false} sharedCanWrite={true} />}
          {deleteTargets.length > 0 && <DeleteConfirm items={deleteTargets} onClose={() => setDeleteTargets([])} onConfirm={() => handleDelete(deleteTargets)} />}
          {previewTarget && (
            <FilePreviewModal
              file={previewTarget} isSharedContext={false} onClose={() => setPreviewTarget(null)} onDownload={() => {}}
              onDelete={user?.perm?.delete ? () => { setPreviewTarget(null); setDeleteTargets([previewTarget]) } : undefined}
              onShare={user?.perm?.share ? () => { setPreviewTarget(null); setShareTarget(previewTarget) } : undefined}
              onRename={user?.perm?.rename ? () => { setPreviewTarget(null); setRenameTarget(previewTarget) } : undefined}
            />
          )}
          {moveCopyTargets && moveCopyAction && (
            <MoveCopyModal
              files={moveCopyTargets}
              action={moveCopyAction}
              currentPath={currentPath}
              folderCache={folderCache}
              onClose={() => { setMoveCopyTargets(null); setMoveCopyAction(null) }}
              onDone={() => { setMoveCopyTargets(null); setMoveCopyAction(null); setSelected(new Set()) }}
            />
          )}
          {shareWithUsersTarget && <ShareWithUsersModal file={shareWithUsersTarget} onClose={() => setShareWithUsersTarget(null)} />}

          {contextMenu && (
            <ContextMenu
              x={contextMenu.x} y={contextMenu.y} item={contextMenu.item} user={user}
              setRenameTarget={setRenameTarget} setMoveCopyTargets={setMoveCopyTargets} setMoveCopyAction={setMoveCopyAction}
              setDeleteTargets={setDeleteTargets} handleMakeGlobal={() => {}} handleRemoveGlobal={() => {}} onClose={() => setContextMenu(null)}
            />
          )}
        </Portal>
      </div>

      <DetailsPanel
        currentPath={currentPath}
        currentFolderName={currentFolderName}
        currentFolder={currentContents?.folder}
        items={items}
        selectedItem={selectedItems.length === 1 ? selectedItems[0] : null}
        onNavigate={navigate} onClearSelection={() => setSelected(new Set())}
        onShareLink={user?.perm?.share && activeSidebarItem && !activeSidebarItem.isDir ? () => setShareTarget(activeSidebarItem) : undefined}
        onShareUsers={user?.perm?.share && activeSidebarItem && !activeSidebarItem.isDir && isPrivateRootActive ? () => setShareWithUsersTarget(activeSidebarItem) : undefined}
        onDownload={user?.perm?.download && activeSidebarItem ? () => {} : undefined}
        onMakeGlobal={user?.perm?.admin && activeSidebarItem ? () => {} : undefined}
        onRemoveGlobal={user?.perm?.admin && activeSidebarItem ? () => {} : undefined}
      />
    </div>
  )
}
