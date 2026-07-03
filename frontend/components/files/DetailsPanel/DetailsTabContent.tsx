'use client'
import {
  Share2, Download, Globe
} from 'lucide-react'
import { clsx } from 'clsx'
import { formatBytes } from '@/lib/api'
import { format } from 'date-fns'
import { FileItem } from '@/types'

export function Avatar({ name }: { name: string }) {
  const colors = ['bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-blue-500']
  const idx = (name || '').charCodeAt(0) % colors.length
  return (
    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white flex-shrink-0', colors[idx] || 'bg-gray-400')}>
      {(name || '?')[0]?.toUpperCase()}
    </div>
  )
}

interface DetailsTabContentProps {
  displayItem: FileItem
  access: any
  loadingSide: boolean
  user: any
  hasSelection: boolean
  onShareLink?: () => void
  onShareUsers?: () => void
  onDownload?: () => void
  onMakeGlobal?: () => void
  onRemoveGlobal?: () => void
}

export function DetailsTabContent({
  displayItem,
  access,
  loadingSide,
  user,
  hasSelection,
  onShareLink,
  onShareUsers,
  onDownload,
  onMakeGlobal,
  onRemoveGlobal,
}: DetailsTabContentProps) {
  const isInvestor = user?.scope === 'investor'

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Who has access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">Who has access</p>
          {onShareUsers && (
            <button onClick={onShareUsers} className="border border-[#dadce0] text-[#1a73e8] rounded-full px-3 py-1 text-[10px] font-bold hover:bg-blue-50/20 focus:outline-none transition-all">
              Manage access
            </button>
          )}
        </div>
        {loadingSide ? (
          <div className="h-7 w-24 bg-gray-100 rounded-full animate-pulse" />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Avatar name={displayItem.owner || access?.owner || user?.username || 'A'} />
              {((access?.people && access.people.length > 0) || access?.hasActiveLink) && (
                <div className="w-[1px] h-4 bg-gray-200 self-center flex-shrink-0" />
              )}
              {(access?.people || []).slice(0, 4).map((p: any) => (
                <Avatar key={p.id} name={p.username} />
              ))}
              {access?.hasActiveLink && (
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3.5 h-3.5 text-green-600" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">
              Owned by {displayItem.owner && displayItem.owner === user?.username ? 'you' : (displayItem.owner || access?.owner || 'System')}.{access?.hasActiveLink ? ' Anyone on the internet with the link can edit.' : ''} {access?.people?.length ? `Shared with ${access.people.length} ${access.people.length === 1 ? 'person' : 'people'}.` : ''}
            </p>
          </>
        )}
      </div>

      {/* Options */}
      {(!isInvestor || (isInvestor && onDownload && !displayItem.isDir)) && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-3">Options</p>
          <div className="space-y-3">
            {!isInvestor && onShareLink && (
              <button onClick={onShareLink} className="w-full flex items-center gap-3.5 text-left focus:outline-none group">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Share link</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{displayItem.isDir ? 'Folders' : 'Files'}</p>
                </div>
              </button>
            )}
            {onDownload && !displayItem.isDir && (
              <button onClick={onDownload} className="w-full flex items-center gap-3.5 text-left focus:outline-none group">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Download</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Files</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* File details */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-sm font-bold text-gray-800 mb-3">File Details</p>
        <div className="space-y-3.5 text-xs">
          <div>
            <p className="font-bold text-gray-800 mb-0.5">Type</p>
            <p className="text-gray-400 capitalize">{displayItem.isDir ? 'Folders' : (displayItem.type || 'Files')}</p>
          </div>
          <div>
            <p className="font-bold text-gray-800 mb-0.5">Size</p>
            <p className="text-gray-400">{formatBytes(displayItem.size || 0)}</p>
          </div>
          <div>
            <p className="font-bold text-gray-800 mb-0.5">Owner</p>
            <p className="text-gray-400">{displayItem.owner || access?.owner || user?.username || '—'}</p>
          </div>
          {hasSelection && (
            <>
              <div>
                <p className="font-bold text-gray-800 mb-0.5">Last Modified</p>
                <p className="text-gray-400">
                  {displayItem.modified && !isNaN(new Date(displayItem.modified).getTime()) ? format(new Date(displayItem.modified), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-0.5">Created Date</p>
                <p className="text-gray-400">
                  {displayItem.created && !isNaN(new Date(displayItem.created).getTime())
                    ? format(new Date(displayItem.created), 'MMM d, yyyy')
                    : displayItem.modified && !isNaN(new Date(displayItem.modified).getTime())
                    ? format(new Date(displayItem.modified), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
