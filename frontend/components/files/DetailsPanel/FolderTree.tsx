'use client'
import { useState, useEffect, useMemo } from 'react'
import { Folder, ChevronRight, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

export type TreeNode = { path: string; name: string; children: TreeNode[] }

export function buildTree(flatDirs: { path: string; name: string }[]): TreeNode {
  const root: TreeNode = { path: '/', name: 'Data Room', children: [] }
  const map = new Map<string, TreeNode>()
  map.set('/', root)

  const cleanDirs = (flatDirs || []).filter(d => d && typeof d.path === 'string')
  const sorted = [...cleanDirs].sort((a, b) => a.path.split('/').length - b.path.split('/').length)
  for (const d of sorted) {
    if (map.has(d.path)) continue
    const node: TreeNode = { path: d.path, name: d.name, children: [] }
    map.set(d.path, node)
    const parentPath = d.path.split('/').slice(0, -1).join('/') || '/'
    const parent = map.get(parentPath) || root
    parent.children.push(node)
  }
  return root
}

export function buildTreeFromNested(data: any): TreeNode {
  const root: TreeNode = { path: '/', name: 'Data Room', children: [] }

  const traverse = (node: any): TreeNode | null => {
    if (!node) return null
    if (node.isDir === false || node.filename || node.mimetype) {
      return null
    }
    const id = node.id || node._id
    if (!id) return null

    const children: TreeNode[] = []
    const subfolders = node.subfolders || node.folders || node.children || []
    if (Array.isArray(subfolders)) {
      for (const sub of subfolders) {
        const childNode = traverse(sub)
        if (childNode) {
          children.push(childNode)
        }
      }
    }

    return {
      path: id,
      name: node.name || '',
      children
    }
  }

  if (Array.isArray(data)) {
    const map = new Map<string, TreeNode>()
    for (const item of data) {
      if (!item || item.isDir === false || item.filename || item.mimetype) continue
      const id = item.id || item._id
      if (!id) continue
      map.set(id, { path: id, name: item.name || '', children: [] })
    }
    for (const item of data) {
      if (!item || item.isDir === false || item.filename || item.mimetype) continue
      const id = item.id || item._id
      const parentId = item.parent_id || item.parentId
      const node = map.get(id)
      if (!node) continue
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node)
      } else {
        root.children.push(node)
      }
    }
  } else if (data && typeof data === 'object') {
    const possibleRoots = data.roots || data.folders || data.tree || data.data
    if (Array.isArray(possibleRoots)) {
      for (const r of possibleRoots) {
        const childNode = traverse(r)
        if (childNode) {
          root.children.push(childNode)
        }
      }
    } else {
      const rootNode = traverse(data)
      if (rootNode) {
        if (!data.parent_id && rootNode.name === 'Data Room') {
          return rootNode
        }
        root.children.push(rootNode)
      }
    }
  }

  return root
}

export function flattenTree(data: any, userUsername?: string, fallbackOwner?: string): any[] {
  const items: any[] = []

  const traverse = (node: any) => {
    if (!node) return
    const id = node.id || node._id
    if (!id) return

    const isDir = !(node.isDir === false || node.filename || node.mimetype)
    const name = node.name || node.filename || ''
    
    items.push({
      path: id,
      name,
      isDir,
      size: node.size || 0,
      modified: node.updatedAt || node.createdAt || node.updated_at || node.created_at || new Date().toISOString(),
      created: node.createdAt || node.created_at || null,
      type: isDir ? 'directory' : (node.mimetype?.split('/')[0] || 'file'),
      owner: node.owner || fallbackOwner || node.issuer_id || userUsername || 'System'
    })

    const subfolders = node.subfolders || node.folders || node.children || []
    if (Array.isArray(subfolders)) {
      for (const sub of subfolders) {
        traverse(sub)
      }
    }

    const documents = node.documents || node.files || []
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        traverse(doc)
      }
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      traverse(item)
    }
  } else if (data && typeof data === 'object') {
    const possibleRoots = data.roots || data.folders || data.tree || data.data
    if (Array.isArray(possibleRoots)) {
      for (const r of possibleRoots) {
        traverse(r)
      }
    } else {
      traverse(data)
    }
  }

  return items
}

export function getFolderDescendants(data: any, targetPath: string): { subDirs: any[], subFiles: any[] } {
  const subDirs: any[] = []
  const subFiles: any[] = []

  const findNode = (node: any): any => {
    if (!node) return null
    const id = node.id || node._id || node.path
    if (id === targetPath) return node

    const subfolders = node.subfolders || node.folders || node.children || []
    if (Array.isArray(subfolders)) {
      for (const sub of subfolders) {
        const found = findNode(sub)
        if (found) return found
      }
    }
    return null
  }

  const collectDescendants = (node: any) => {
    if (!node) return
    const id = node.id || node._id || node.path
    if (id !== targetPath) {
      const isDir = !(node.isDir === false || node.filename || node.mimetype)
      if (isDir) {
        subDirs.push(node)
      } else {
        subFiles.push(node)
      }
    }

    const subfolders = node.subfolders || node.folders || node.children || []
    if (Array.isArray(subfolders)) {
      for (const sub of subfolders) {
        collectDescendants(sub)
      }
    }

    const documents = node.documents || node.files || []
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        subFiles.push(doc)
      }
    }
  }

  if (targetPath === '/' || targetPath === '') {
    if (Array.isArray(data)) {
      for (const item of data) {
        collectDescendants(item)
      }
    } else if (data && typeof data === 'object') {
      const possibleRoots = data.roots || data.folders || data.tree || data.data
      if (Array.isArray(possibleRoots)) {
        for (const r of possibleRoots) {
          collectDescendants(r)
        }
      } else {
        collectDescendants(data)
      }
    }
  } else {
    let targetNode = null
    if (Array.isArray(data)) {
      for (const item of data) {
        targetNode = findNode(item)
        if (targetNode) break
      }
    } else if (data && typeof data === 'object') {
      const possibleRoots = data.roots || data.folders || data.tree || data.data
      if (Array.isArray(possibleRoots)) {
        for (const r of possibleRoots) {
          targetNode = findNode(r)
          if (targetNode) break
        }
      } else {
        targetNode = findNode(data)
      }
    }

    if (targetNode) {
      collectDescendants(targetNode)
    }
  }

  return { subDirs, subFiles }
}

export function extractAllDirs(allItems: any[]): { path: string; name: string }[] {
  const dirPaths = new Set<string>()
  
  for (const item of allItems || []) {
    if (!item) continue
    const itemPath = item.path || item.id || item._id
    if (typeof itemPath !== 'string') continue
    if (item.isDir) {
      const cleanPath = itemPath.replace(/\/$/, '')
      if (cleanPath && cleanPath !== '') {
        dirPaths.add(cleanPath)
      }
    } else {
      const parts = itemPath.split('/').filter(Boolean)
      let current = ''
      for (let i = 0; i < parts.length - 1; i++) {
        current += '/' + parts[i]
        dirPaths.add(current)
      }
    }
  }

  return Array.from(dirPaths).map(p => {
    return {
      path: p,
      name: p.split('/').pop() || ''
    }
  })
}

function hasActiveDescendant(node: TreeNode, activePath: string): boolean {
  if (!node || !activePath) return false
  for (const child of node.children) {
    if (child.path === activePath || hasActiveDescendant(child, activePath)) {
      return true
    }
  }
  return false
}

interface TreeRowProps {
  node: TreeNode
  depth: number
  activePath: string
  onNavigate: (p: string) => void
  globalPaths: Set<string>
}

export function TreeRow({ node, depth, activePath, onNavigate, globalPaths }: TreeRowProps) {
  const isActive = node.path === activePath
  const hasChildren = node.children.length > 0
  const isTopLevel = depth === 1

  const isParentOrActive = useMemo(() => {
    return node.path === activePath || hasActiveDescendant(node, activePath)
  }, [node, activePath])

  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    if (isParentOrActive && isTopLevel) {
      setCollapsed(false)
    }
  }, [isParentOrActive, isTopLevel])

  return (
    <div className="w-full">
      <div className={clsx(
        'flex items-center gap-1 rounded-lg my-0.5',
        isActive ? 'bg-[#deeeff]' : 'hover:bg-gray-50'
      )}>
        {/* Collapse toggle */}
        {isTopLevel && hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(v => !v) }}
            className={clsx(
              'flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors focus:outline-none',
              isActive ? 'text-[#0062cc]' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : (
          <span className={clsx('flex-shrink-0 w-5', !isTopLevel && 'hidden')} />
        )}

        {/* Navigate button */}
        <button
          onClick={() => onNavigate(node.path)}
          className={clsx(
            'flex-1 flex items-center gap-2 py-1.5 pr-3 text-left text-xs font-semibold transition-colors focus:outline-none',
            isTopLevel ? 'pl-0' : 'pl-3',
            isActive ? 'text-[#0062cc]' : 'text-gray-700 hover:text-gray-900'
          )}
        >
          <Folder className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-[#007aff] fill-[#007aff]/20' : 'text-blue-500 fill-blue-50')} />
          <span className="truncate flex-1">{node.name}</span>
          {globalPaths.has(node.path.replace(/\/$/, '')) && (
            <span className={clsx(
              'text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0',
              isActive ? 'bg-white/80 text-[#0062cc]' : 'bg-gray-100 text-gray-500'
            )}>
              Global
            </span>
          )}
        </button>
      </div>

      {hasChildren && (!isTopLevel || !collapsed) && (
        <div className="ml-6 pl-3 border-l border-gray-200/80 space-y-0.5 relative">
          {node.children.map(child => (
            <TreeRow key={child.path} node={child} depth={depth + 1} activePath={activePath} onNavigate={onNavigate} globalPaths={globalPaths} />
          ))}
        </div>
      )}
    </div>
  )
}
