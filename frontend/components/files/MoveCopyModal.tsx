'use client'
import { useEffect, useState, useMemo } from 'react'
import { X, Folder, ChevronRight, ArrowLeft, ArrowRight, Copy } from 'lucide-react'
import { ddmsFoldersService, ddmsDocumentsService } from '@/lib/services/ddmsService'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { useQueryClient } from '@tanstack/react-query'

interface MoveCopyModalProps {
  files: any[]
  action: 'copy' | 'move'
  currentPath: string
  folderCache?: Record<string, { name: string; parentId: string | null }>
  onClose: () => void
  onDone: () => void
}

export function MoveCopyModal({
  files,
  action,
  currentPath,
  folderCache,
  onClose,
  onDone
}: MoveCopyModalProps) {
  const [navigatedPath, setNavigatedPath] = useState(currentPath || '/')
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const qc = useQueryClient()

  // Track local folder cache to resolve folder names and parent folder relations
  const [localFolderCache, setLocalFolderCache] = useState<Record<string, { name: string; parentId: string | null }>>({
    '/': { name: 'Home', parentId: null }
  })

  // Sync prop folderCache
  useEffect(() => {
    if (folderCache) {
      setLocalFolderCache(prev => ({ ...prev, ...folderCache }))
    }
  }, [folderCache])

  // Fetch folders in navigatedPath
  useEffect(() => {
    let active = true
    const fetchFolders = async () => {
      if (!navigatedPath) return
      setLoading(true)
      try {
        let foldersList: any[] = []
        if (navigatedPath === '/') {
          foldersList = await ddmsFoldersService.getRoots()
          if (!active) return
          setLocalFolderCache(prev => {
            const next = { ...prev }
            let changed = false
            for (const r of foldersList) {
              const id = (r as any)._id || (r as any).id
              if (id && (!next[id] || next[id].name !== r.name)) {
                next[id] = { name: r.name, parentId: null }
                changed = true
              }
            }
            return changed ? next : prev
          })
        } else {
          const res = await ddmsFoldersService.getContents(navigatedPath)
          foldersList = res.folders || []
          if (!active) return

          // Cache the current folder info
          if (res.folder) {
            const f = res.folder as any
            const id = f._id || f.id
            const parentId = f.parent_id || null
            setLocalFolderCache(prev => {
              if (prev[id] && prev[id].name === f.name && prev[id].parentId === parentId) return prev
              return { ...prev, [id]: { name: f.name, parentId } }
            })
          }

          // Cache subfolders
          setLocalFolderCache(prev => {
            const next = { ...prev }
            let changed = false
            for (const f of foldersList) {
              const id = f._id || f.id
              const parentId = f.parent_id || null
              if (id && (!next[id] || next[id].name !== f.name)) {
                next[id] = { name: f.name, parentId }
                changed = true
              }
            }
            return changed ? next : prev
          })
        }

        const allItems = foldersList.map((f: any) => ({ ...f, isDir: true, path: f._id || f.id, name: f.name }))
        // Only keep directories
        const dirs = allItems.filter((item: any) => item.isDir)
        setFolders(dirs)
      } catch (err: any) {
        if (active) {
          toast.error(err.response?.data?.error || 'Failed to load directories')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchFolders()
    return () => {
      active = false
    }
  }, [navigatedPath])

  // Get parent path helper
  const handleGoUp = () => {
    if (!navigatedPath || navigatedPath === '/') return
    const currentCached = localFolderCache[navigatedPath]
    if (currentCached?.parentId) {
      setNavigatedPath(currentCached.parentId)
    } else {
      setNavigatedPath('/')
    }
  }

  // Check if target is invalid (e.g. moving a folder into itself)
  const isInvalidTarget = () => {
    if (navigatedPath === '/') return true
    return files.some(file => {
      if (!file.isDir) return false
      if (!navigatedPath) return false
      // Cannot move a folder into itself
      if (navigatedPath === file.path) return true
      // Cannot move a folder into its own subfolder
      if (navigatedPath.startsWith(file.path + '/')) return true
      return false
    })
  }

  const handleSubmit = async () => {
    if (isInvalidTarget()) {
      toast.error('Cannot move or copy items to this location')
      return
    }

    setActionLoading(true)
    try {
      for (const file of files) {
        if (action === 'move') {
          if (file.isDir) {
            await ddmsFoldersService.move(file.path, { parent_id: navigatedPath })
          } else {
            await ddmsDocumentsService.move(file.path, { folder_id: navigatedPath })
          }
        } else {
          if (file.isDir) {
            await ddmsFoldersService.copy(file.path, { parent_id: navigatedPath, name: file.name })
          } else {
            await ddmsDocumentsService.copy(file.path, { folder_id: navigatedPath })
          }
        }
      }
      toast.success(`${action === 'move' ? 'Moved' : 'Copied'} ${files.length} item${files.length > 1 ? 's' : ''} successfully`)
      qc.invalidateQueries({ queryKey: ['ddmsFolders'] })
      qc.invalidateQueries({ queryKey: ['ddmsDocuments'] })
      qc.invalidateQueries({ queryKey: ['ddmsInvestor'] })
      onDone()
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${action} items`)
    } finally {
      setActionLoading(false)
    }
  }

  // Build the nested breadcrumbs items list
  const breadcrumbItems = useMemo(() => {
    if (navigatedPath === '/') {
      return [{ label: 'Home', path: '/' }]
    }

    const trail: { label: string; path: string }[] = []
    let currId = navigatedPath
    while (currId && currId !== '/') {
      const cached = localFolderCache[currId]
      if (cached) {
        trail.unshift({ label: cached.name, path: currId })
        currId = cached.parentId || ''
      } else {
        // Fallback
        trail.unshift({ label: currId, path: currId })
        break
      }
    }
    return [{ label: 'Home', path: '/' }, ...trail]
  }, [navigatedPath, localFolderCache])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-md animate-slide-up border border-[#e8eaed] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eaed]">
          <div className="flex items-center gap-2">
            {action === 'move' ? (
              <ArrowRight className="w-4 h-4 text-primary-500" />
            ) : (
              <Copy className="w-4 h-4 text-primary-500" />
            )}
            <h2 className="font-bold text-gray-800 text-[15px] capitalize">
              {action} {files.length > 1 ? `${files.length} Items` : `"${files[0]?.name}"`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Path Breadcrumb */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 text-xs text-gray-600 overflow-x-auto whitespace-nowrap">
          {breadcrumbItems.map((b, i) => (
            <span key={b.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
              <button 
                onClick={() => setNavigatedPath(b.path)}
                className="hover:text-primary-600 font-semibold"
              >
                {b.label}
              </button>
            </span>
          ))}
        </div>

        {/* Directory browser list */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[250px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {navigatedPath !== '/' && navigatedPath !== '' && (
                <button
                  key="go-up"
                  onClick={handleGoUp}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors text-left font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                  <span>.. (Go back up)</span>
                </button>
              )}

              {folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Folder className="w-12 h-12 opacity-20 mb-2" />
                  <p className="text-xs">No folders here</p>
                </div>
              ) : (
                folders.map((folder) => {
                  const isSelf = files.some(f => f.path === folder.path)
                  return (
                    <button
                      key={folder.path}
                      disabled={isSelf}
                      onClick={() => setNavigatedPath(folder.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                        isSelf 
                          ? 'opacity-40 cursor-not-allowed bg-gray-50' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder className={`w-4 h-4 flex-shrink-0 ${isSelf ? 'text-gray-400' : 'text-blue-500'}`} />
                        <span className="truncate font-semibold">{folder.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-[#e8eaed] bg-gray-50/50 flex gap-3 rounded-b-xl">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={actionLoading}
            disabled={isInvalidTarget() || loading}
            className="flex-1 font-semibold"
          >
            {action === 'move' ? 'Move Here' : 'Copy Here'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MoveCopyModal
