'use client'
import { Edit2, Copy, ArrowRight, Trash2, Globe } from 'lucide-react'
import { FileItem } from '@/types'

interface ContextMenuProps {
  x: number
  y: number
  item: FileItem
  user: any
  setRenameTarget: (item: FileItem) => void
  setMoveCopyTargets: (items: FileItem[]) => void
  setMoveCopyAction: (action: 'copy' | 'move') => void
  setDeleteTargets: (items: FileItem[]) => void
  handleMakeGlobal: (item: FileItem) => void
  handleRemoveGlobal: (item: FileItem) => void
  onClose: () => void
}

export default function ContextMenu({
  x,
  y,
  item,
  user,
  setRenameTarget,
  setMoveCopyTargets,
  setMoveCopyAction,
  setDeleteTargets,
  handleMakeGlobal,
  handleRemoveGlobal,
  onClose,
}: ContextMenuProps) {
  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 z-50 text-left animate-fade-in"
      style={{
        top: Math.min(y, (globalThis.window?.innerHeight ?? 600) - 220),
        left: Math.min(x, (globalThis.window?.innerWidth ?? 400) - 180)
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {user?.perm?.rename && (
        <button
          onClick={() => {
            setRenameTarget(item)
            onClose()
          }}
          className="w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-semibold text-left"
        >
          <Edit2 className="w-4 h-4 text-gray-500" />
          <span>Rename</span>
        </button>
      )}
      {user?.perm?.create && (
        <button
          onClick={() => {
            setMoveCopyTargets([item])
            setMoveCopyAction('copy')
            onClose()
          }}
          className="w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-semibold text-left"
        >
          <Copy className="w-4 h-4 text-gray-500" />
          <span>Copy file</span>
        </button>
      )}
      {user?.perm?.rename && (
        <button
          onClick={() => {
            setMoveCopyTargets([item])
            setMoveCopyAction('move')
            onClose()
          }}
          className="w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-semibold text-left"
        >
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <span>Move file</span>
        </button>
      )}
      {user?.perm?.delete && !item.isGlobal && (
        <button
          onClick={() => {
            setDeleteTargets([item])
            onClose()
          }}
          className="w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-3 font-semibold border-t border-gray-100 text-left"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          <span>Delete</span>
        </button>
      )}
    </div>
  )
}
