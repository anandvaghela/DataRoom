'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Folder, File, FileText, Image as ImageIcon, Film, Music, X, Download, Share2,
  Info, Globe, Lock, ShieldCheck
} from 'lucide-react'
import { clsx } from 'clsx'
import { formatBytes, getUser } from '@/lib/api'
import { format } from 'date-fns'
import { FileItem } from '@/types'
import { useDDMSRoots, useDDMSInvestorIssuerRoots, useDDMSFolderTree, useDDMSInvestorRoots, useDDMSInvestorTree } from '@/lib/hooks/useDDMS'
import { buildTree, buildTreeFromNested, flattenTree, getFolderDescendants, TreeRow, TreeNode } from './DetailsPanel/FolderTree'
import { DetailsTabContent, Avatar } from './DetailsPanel/DetailsTabContent'

function ItemIcon({ item, className }: { item: FileItem; className?: string }) {
  if (item.isDir) return <Folder className={clsx('text-blue-500 fill-blue-100', className)} />
  const t = item.type || ''
  if (t === 'image') return <ImageIcon className={clsx('text-pink-500', className)} />
  if (t === 'video') return <Film className={clsx('text-purple-500', className)} />
  if (t === 'audio') return <Music className={clsx('text-green-500', className)} />
  if (t === 'text' || t === 'pdf') return <FileText className={clsx('text-orange-500', className)} />
  return <File className={clsx('text-gray-400', className)} />
}

function ActivityList({
  loadingSide,
  activity,
}: Readonly<{
  loadingSide: boolean
  activity: any[]
}>) {
  if (loadingSide) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }
  if (activity.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-6">No activity yet</p>
  }
  return (
    <div className="space-y-4">
      {activity.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5">
          <Avatar name={a.username} />
          <div className="min-w-0">
            <p className="text-xs text-gray-700 leading-snug">
              <span className="font-bold">{a.username}</span> {a.action}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {a.createdAt ? format(new Date(a.createdAt * 1000), 'h:mm a, MMM d') : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatOwner(rawOwner: string): string {
  if (!rawOwner) return 'System'
  if (rawOwner.includes('@')) {
    const localPart = rawOwner.split('@')[0]
    const baseName = localPart.split('+')[0]
    return baseName
      .split(/[\._\-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return rawOwner
}
export default function DetailsPanel({
  currentPath,
  currentFolderName,
  currentFolder,
  currentFolderOwner,
  items,
  selectedItem,
  onNavigate,
  onClearSelection,
  onShareLink,
  onShareUsers,
  onDownload,
  onMakeGlobal,
  onRemoveGlobal,
}: Readonly<{
  currentPath: string
  currentFolderName?: string
  currentFolder?: any
  currentFolderOwner?: string
  items: FileItem[]
  selectedItem: FileItem | null
  onNavigate: (path: string) => void
  onClearSelection: () => void
  onShareLink?: () => void
  onShareUsers?: () => void
  onDownload?: () => void
  onMakeGlobal?: () => void
  onRemoveGlobal?: () => void
}>) {
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [allItemsRecursive, setAllItemsRecursive] = useState<FileItem[]>([])
  const [tab, setTab] = useState<'details' | 'activity'>('details')
  const [access, setAccess] = useState<any | null>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [loadingSide, setLoadingSide] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    setUser(getUser())
  }, [])

  const isInvestor = user?.scope === 'investor'
  const issuerId = (user as any)?.issuerId || (user as any)?.issuer_id || '6a142d3460f222865a432a1b'

  // Fetch roots via react-query
  const { data: investorRoots } = useDDMSInvestorRoots(!!user && isInvestor)
  const { data: issuerRoots } = useDDMSRoots(!!user && !isInvestor)
  const roots = isInvestor ? investorRoots : issuerRoots

  // Find current active issuerId for investor
  const activeIssuerId = useMemo(() => {
    if (!isInvestor) return null

    // 1. If we are inside a folder, check currentFolder
    if (currentFolder) {
      const cid = currentFolder.issuer_id || currentFolder.issuer?._id || currentFolder.issuerId
      if (cid) return cid
    }

    // 2. Or, if an item is selected, check its issuerId
    if (selectedItem?.issuerId) {
      return selectedItem.issuerId
    }

    // 3. Or, if we are inside a subfolder, check if there's any item in items that has issuerId
    if (currentPath && currentPath !== '/' && items && items.length > 0) {
      const firstWithIssuer = items.find(i => i.issuerId)
      if (firstWithIssuer?.issuerId) return firstWithIssuer.issuerId
    }

    return null
  }, [isInvestor, currentFolder, selectedItem, items, currentPath])

  // Fetch full tree for investor using activeIssuerId
  const { data: investorTreeData } = useDDMSInvestorTree(activeIssuerId ?? '', !!user && isInvestor && !!activeIssuerId)

  // Fetch full tree for issuer
  const { data: treeData } = useDDMSFolderTree(!!user && !isInvestor)

  // Set tree and allItemsRecursive from treeData (issuer) or roots (investor fallback)
  useEffect(() => {
    if (!user) return

    if (!isInvestor) {
      if (!treeData) return
      setTree(buildTreeFromNested(treeData))
      setAllItemsRecursive(flattenTree(treeData, user.username, user.company_legal_name))
    } else {
      if (activeIssuerId) {
        if (investorTreeData) {
          setTree(buildTreeFromNested(investorTreeData))
          const firstWithIssuer = items.find(i => i.issuerId === activeIssuerId)
          const companyName = firstWithIssuer?.owner || firstWithIssuer?.sharedBy || user.company_legal_name || 'System'
          setAllItemsRecursive(flattenTree(investorTreeData, user.username, companyName))
        }
        return
      }

      if (!roots) return
      const rootsArray = Array.isArray(roots)
        ? roots
        : (roots && typeof roots === 'object' && 'folders' in (roots as any) && Array.isArray((roots as any).folders)
            ? (roots as any).folders
            : (roots && typeof roots === 'object' && 'data' in (roots as any) && Array.isArray((roots as any).data)
                ? (roots as any).data
                : []))
      const mappedRoots = rootsArray.map((f: any) => {
        const companyName = f.issuer?.company_legal_name || f.company_legal_name || f.owner
        const name = (f.is_root && companyName) ? companyName : f.name
        return {
          path: f.id || f._id,
          name,
          isDir: true,
          size: f.size || 0,
          modified: f.updatedAt || f.createdAt || f.updated_at || f.created_at || new Date().toISOString(),
          created: f.createdAt || f.created_at || null,
          type: 'directory',
          owner: companyName || user?.username || 'System',
          isRoot: f.is_root || false,
          rootType: f.root_type || null,
          issuerId: f.issuer_id || f.issuer?._id || null
        }
      })

      setTree(buildTree(mappedRoots.map((item: any) => ({ path: item.path, name: item.name }))))
      setAllItemsRecursive(mappedRoots as any)
    }
  }, [treeData, investorTreeData, roots, user, isInvestor, activeIssuerId, items])

  // Accumulate navigated directories (only for investor fallback)
  useEffect(() => {
    if (!isInvestor || !activeIssuerId) return
    if (!items || items.length === 0) return
    const folders = items.filter(i => i.isDir)
    if (folders.length === 0) return

    setAllItemsRecursive(prev => {
      const next = [...prev]
      let changed = false
      for (const f of folders) {
        if (!next.some((item: FileItem) => item.path === f.path)) {
          next.push(f)
          changed = true
        }
      }
      if (changed) {
        setTree(buildTree(next.map((item: FileItem) => ({ path: item.path, name: item.name }))))
        return next
      }
      return prev
    })
  }, [items, isInvestor])

  const activePath = selectedItem?.isDir ? selectedItem.path : currentPath

  const activeStats = useMemo(() => {
    let subDirs: any[] = []
    let subFiles: any[] = []

    const list = Array.isArray(allItemsRecursive) ? allItemsRecursive : []
    const normalised = activePath.replace(/\/$/, '')
    const folderObj = list.find(i => i && i.isDir && i.path && i.path.replace(/\/$/, '') === normalised) ||
      (selectedItem && selectedItem.path.replace(/\/$/, '') === normalised ? selectedItem : null)

    if (!isInvestor && treeData) {
      const descendants = getFolderDescendants(treeData, activePath)
      subDirs = descendants.subDirs
      subFiles = descendants.subFiles
    } else {
      const prefix = normalised === '' ? '/' : normalised + '/'

      subDirs = list.filter(i => 
        i && i.isDir && 
        (normalised === '' 
          ? true 
          : i.path && i.path.startsWith(prefix) && i.path.replace(/\/$/, '') !== normalised)
      )
      subFiles = list.filter(i => 
        i && !i.isDir && 
        (normalised === '' 
          ? true 
          : i.path && i.path.startsWith(prefix))
      )
    }

    const isSelectedActive = !!selectedItem && selectedItem.path.replace(/\/$/, '') === normalised
    const size = isSelectedActive && selectedItem.size !== undefined && selectedItem.size > 0
      ? selectedItem.size
      : (folderObj && folderObj.size) ? folderObj.size : subFiles.reduce((s, f) => s + (f?.size || 0), 0)
    
    let latest = 0
    subFiles.forEach(f => {
      if (f?.modified) {
        const t = new Date(f.modified).getTime()
        if (t > latest) latest = t
      }
    })

    const folderObjModified = (isSelectedActive && selectedItem.modified) || folderObj?.modified
    if (folderObjModified && !latest) {
      latest = new Date(folderObjModified).getTime()
    }

    const cachedCompanyName = typeof window !== 'undefined' ? sessionStorage.getItem('ddms_company_legal_name') : null
    const rawOwner = (isSelectedActive && selectedItem.owner) || folderObj?.owner || currentFolderOwner || user?.company_legal_name || user?.username || cachedCompanyName || 'Admin'
    const owner = (isInvestor && currentPath === '/' && !selectedItem)
      ? '—'
      : (isInvestor && selectedItem)
      ? (selectedItem.owner || '—')
      : currentFolderOwner || (((user?.scope === 'issuer' && user?.company_legal_name &&
        (rawOwner === user.username || rawOwner === String(user.id) || rawOwner === 'Admin' || rawOwner === 'System' || rawOwner.match(/^[0-9a-fA-F]{24}$/)))
        ? user.company_legal_name
        : (user?.scope === 'investor' && rawOwner)
        ? rawOwner
        : formatOwner(rawOwner)))

    return {
      folders: subDirs.length,
      files: subFiles.length,
      size,
      latest: latest || null,
      owner,
      modified: folderObjModified || (latest ? new Date(latest).toISOString() : null),
      created: (isSelectedActive && selectedItem.created) || folderObj?.created || folderObjModified || (latest ? new Date(latest).toISOString() : null)
    }
  }, [allItemsRecursive, activePath, user, isInvestor, treeData, selectedItem, currentFolderOwner])

  const displayItem = useMemo<FileItem>(() => {
    if (selectedItem) {
      const cachedCompanyName = typeof window !== 'undefined' ? sessionStorage.getItem('ddms_company_legal_name') : null
      const rawOwner = selectedItem.owner || user?.company_legal_name || user?.username || cachedCompanyName
      const resolvedOwner = (user?.scope === 'issuer' && user?.company_legal_name && rawOwner &&
        (rawOwner === user.username || rawOwner === String(user.id) || rawOwner === 'System' || rawOwner === 'Admin' || rawOwner.match(/^[0-9a-fA-F]{24}$/)))
        ? user.company_legal_name
        : (user?.scope === 'investor' && rawOwner)
        ? rawOwner
        : formatOwner(rawOwner || '')

      return {
        ...selectedItem,
        owner: resolvedOwner
      }
    }

    const isRoot = currentPath === '/' || currentPath === ''
    const name = isRoot ? 'Home' : (currentFolderName || currentPath)

    const modified = currentFolder
      ? (currentFolder.updatedAt || currentFolder.updated_at || currentFolder.createdAt || currentFolder.created_at || new Date().toISOString())
      : activeStats.modified

    const created = currentFolder
      ? (currentFolder.createdAt || currentFolder.created_at || null)
      : activeStats.created

    const size = currentFolder && currentFolder.size !== undefined
      ? currentFolder.size
      : activeStats.size

    const rawOwner = currentFolder
      ? (currentFolder.issuer?.company_legal_name || currentFolder.company_legal_name || currentFolder.owner || currentFolder.issuer_id || user?.company_legal_name || user?.username || 'System')
      : activeStats.owner

    const owner = (isInvestor && (currentPath === '/' || currentPath === ''))
      ? '—'
      : currentFolderOwner || (((user?.scope === 'issuer' && user?.company_legal_name &&
        (rawOwner === user.username || rawOwner === String(user.id) || rawOwner === 'System' || rawOwner === 'Admin' || rawOwner.match(/^[0-9a-fA-F]{24}$/)))
        ? user.company_legal_name
        : (user?.scope === 'investor' && rawOwner)
        ? rawOwner
        : formatOwner(rawOwner)))

    return {
      name,
      path: currentPath,
      isDir: true,
      size,
      modified,
      created,
      owner,
      isGlobal: currentFolder?.is_global || false,
      isVirtual: true,
    }
  }, [selectedItem, currentPath, currentFolderName, currentFolder, activeStats, user, currentFolderOwner, isInvestor])

  const showTree = currentPath === '/' && displayItem?.isDir

  useEffect(() => {
    if (!displayItem || (displayItem.isDir && showTree)) { setAccess(null); setActivity([]); return }
    setTab('details')
    setLoadingSide(true)
    Promise.all([
      Promise.resolve(null),
      Promise.resolve({ items: [] }),
    ]).then(([accessRes, activityRes]) => {
      setAccess(accessRes)
      setActivity((activityRes as any)?.items || [])
    }).finally(() => setLoadingSide(false))
  }, [displayItem?.path, showTree])

  const isFileSelected = !!displayItem && !displayItem.isDir

  if (!mounted) {
    return <aside className="hidden lg:flex flex-col w-[300px] xl:w-[330px] flex-shrink-0 border-l border-gray-100 bg-white" />
  }

  return (
    <aside className="hidden lg:flex flex-col w-[300px] xl:w-[330px] flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
      {isFileSelected || !showTree ? (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className={clsx(
              "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
              displayItem.isDir ? "bg-blue-50" : "bg-orange-50"
            )}>
              <ItemIcon item={displayItem} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{displayItem.name}</p>
              <p className="text-[11px] text-gray-400 uppercase">
                {displayItem.isDir ? 'folder' : (displayItem.type || 'file')} · {formatBytes(displayItem.size || 0)}
              </p>
            </div>
            {selectedItem && (
              <button onClick={onClearSelection} className="text-gray-400 hover:text-gray-600 focus:outline-none flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <DetailsTabContent
            displayItem={displayItem}
            access={access}
            loadingSide={loadingSide}
            user={user}
            hasSelection={!!selectedItem}
            onShareLink={onShareLink}
            onShareUsers={onShareUsers}
            onDownload={onDownload}
            onMakeGlobal={onMakeGlobal}
            onRemoveGlobal={onRemoveGlobal}
          />
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Folder structure */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-800">Folder Structure</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {allItemsRecursive.length > 0
                  ? `${activeStats.folders} Folders • ${activeStats.files} Files`
                  : '—'}
              </p>
            </div>
            {selectedItem && (
              <button onClick={onClearSelection} className="text-gray-400 hover:text-gray-600 focus:outline-none flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="px-3 py-2 max-h-[45vh] overflow-y-auto">
            {tree ? (
              <TreeRow node={tree} depth={0} activePath={activePath} onNavigate={onNavigate} globalPaths={new Set()} />
            ) : (
              <div className="space-y-2 p-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />)}
              </div>
            )}
          </div>

          {/* Options */}
          {!isInvestor && onShareLink && (
            <div className="px-5 py-3 border-t border-gray-100 bg-white">
              <p className="text-sm font-bold text-gray-800 mb-3">Options</p>
              <div className="space-y-3">
                <button onClick={onShareLink} className="w-full flex items-center gap-3.5 text-left focus:outline-none group">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Share link</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Folders</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* File details */}
          <div className="px-5 py-4 border-t border-gray-100 mt-2 bg-white">
            <p className="text-sm font-bold text-gray-800 mb-3">File Details</p>
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="font-bold text-gray-800 mb-0.5">Type</p>
                <p className="text-gray-400">Folders</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-0.5">Size</p>
                <p className="text-gray-400">
                  {(allItemsRecursive.length > 0 || !!selectedItem) ? formatBytes(activeStats.size) : '—'}
                </p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-0.5">Owner</p>
                <p className="text-gray-400">{activeStats.owner}</p>
              </div>
              {selectedItem && (
                <>
                  <div>
                    <p className="font-bold text-gray-800 mb-0.5">Last Modified</p>
                    <p className="text-gray-400">
                      {activeStats.modified && !isNaN(new Date(activeStats.modified).getTime())
                        ? format(new Date(activeStats.modified), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 mb-0.5">Created Date</p>
                    <p className="text-gray-400">
                      {activeStats.created && !isNaN(new Date(activeStats.created).getTime())
                        ? format(new Date(activeStats.created), 'MMM d, yyyy')
                        : activeStats.modified && !isNaN(new Date(activeStats.modified).getTime())
                        ? format(new Date(activeStats.modified), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Folder access info (issuer only, at root level) */}
          {!isInvestor && currentPath === '/' && (() => {
            const selectedName = selectedItem?.name?.toLowerCase() || ''
            const showPublic = !selectedItem || selectedName === 'public'
            const showPrivate = !selectedItem || selectedName === 'private'
            const showProtected = !selectedItem || selectedName === 'protected'

            if (!showPublic && !showPrivate && !showProtected) return null

            return (
              <div className="px-4 py-3 space-y-2.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  {selectedItem ? `${selectedItem.name} Folder Info` : 'Folder Access Guide'}
                </p>
                {showPublic && (
                  <div className="rounded-lg border border-green-200 bg-green-50/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-green-800">Public Folder</p>
                        <p className="text-[10px] text-green-700 mt-0.5 leading-relaxed">
                          Visible to all users including investors. Files uploaded here can be viewed by anyone with access to the platform.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {showPrivate && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-800">Private Folder</p>
                        <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                          Only visible to investors who have signed an NDA. Files here are protected and require NDA verification before access is granted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {showProtected && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-blue-800">Protected Folder</p>
                        <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                          Strictly confidential — visible only to you. No investors or external users can access files in this folder.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </aside>
  )
}
