'use client'
import { useState } from 'react'
import { X, Edit2, FolderPlus, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { ddmsFoldersService } from '@/lib/services/ddmsService'
import { ddmsDocumentsService } from '@/lib/services/ddmsService'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useQueryClient } from '@tanstack/react-query'

const FORBIDDEN_FOLDER_NAMES = ['private', 'protected', 'public']

// ── Rename ─────────────────────────────────────────────────────────────────────
export function RenameModal({ file, currentPath, onClose, onDone }: {
  file: any; currentPath: string; onClose: () => void; onDone: () => void
}) {
  const [name, setName] = useState(file.name)
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName === file.name) { onClose(); return }

    if (file.isDir) {
      if (FORBIDDEN_FOLDER_NAMES.includes(trimmedName.toLowerCase())) {
        toast.error(`Folder name '${trimmedName}' is reserved and cannot be used`)
        return
      }
    } else {
      const originalDotIndex = file.name.lastIndexOf('.')
      const originalExt = originalDotIndex !== -1 ? file.name.slice(originalDotIndex) : ''

      const newDotIndex = trimmedName.lastIndexOf('.')
      const newExt = newDotIndex !== -1 ? trimmedName.slice(newDotIndex) : ''

      if (newExt.toLowerCase() !== originalExt.toLowerCase()) {
        toast.error(originalExt ? `Changing or removing the file extension is not allowed. The extension must remain '${originalExt}'` : 'Adding an extension to this file is not allowed')
        return
      }
    }

    setLoading(true)
    try {
      if (file.isDir) {
        await ddmsFoldersService.rename(file.path, { name: trimmedName })
      } else {
        await ddmsDocumentsService.rename(file.path, { filename: trimmedName })
      }
      toast.success('Renamed successfully')
      qc.invalidateQueries({ queryKey: ['ddmsFolders'] })
      qc.invalidateQueries({ queryKey: ['ddmsDocuments'] })
      qc.invalidateQueries({ queryKey: ['ddmsInvestor'] })
      onDone()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Rename failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-sm animate-slide-up border border-[#e8eaed]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eaed]">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-gray-800 text-[15px]">Rename</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onFocus={e => {
              const dotIndex = file.name.lastIndexOf('.')
              if (!file.isDir && dotIndex !== -1) {
                // Select only the filename part, excluding the extension
                e.target.setSelectionRange(0, dotIndex)
              } else {
                e.target.select()
              }
            }}
            placeholder="Name"
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Rename
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RenameModal

// ── New Folder ─────────────────────────────────────────────────────────────────
export function NewFolderModal({ currentPath, onClose, onDone, user, isSharedContext, sharedCanWrite }: {
  currentPath: string; onClose: () => void; onDone: () => void; user?: any; isSharedContext?: boolean; sharedCanWrite?: boolean
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const isAdmin = user?.perm?.admin
  const qc = useQueryClient()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (FORBIDDEN_FOLDER_NAMES.includes(trimmedName.toLowerCase())) {
      toast.error(`Folder name '${trimmedName}' is reserved and cannot be used`)
      return
    }
    if (isSharedContext && !sharedCanWrite) {
      toast.error('You have read-only access to this folder')
      return
    }
    setLoading(true)
    try {
      if (currentPath === '/') {
        toast.error('Please open a folder first before creating a subfolder')
        setLoading(false)
        return
      }
      await ddmsFoldersService.create({ parent_id: currentPath, name: trimmedName })

      toast.success('Folder created')
      qc.invalidateQueries({ queryKey: ['ddmsFolders'] })
      qc.invalidateQueries({ queryKey: ['ddmsInvestor'] })
      onDone()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create folder')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-sm animate-slide-up border border-[#e8eaed]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eaed]">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-gray-800 text-[15px]">New Folder</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <Input
            placeholder="Folder name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!name.trim()} className="flex-1">
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
export function DeleteConfirm({ items, onClose, onConfirm }: {
  items: any[]; onClose: () => void; onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-sm p-6 animate-slide-up border border-[#e8eaed]">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="font-bold text-gray-800 text-[15px] mb-1">Delete {items.length > 1 ? `${items.length} items` : `"${items[0]?.name}"`}?</h2>
        <p className="text-xs text-gray-500 mb-6">
          This action cannot be undone. The {items.length > 1 ? 'items' : 'file'} will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 focus:ring-red-100"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
