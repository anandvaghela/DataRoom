'use client'
import { ArrowUpDown } from 'lucide-react'
import { FileItem } from '@/types'
import FileListRow from '../FileListRow'

interface FilesListProps {
  folders: FileItem[]
  files: FileItem[]
  selected: Set<string>
  sortBy: 'name' | 'size' | 'modified'
  setSortBy: (field: 'name' | 'size' | 'modified') => void
  sortAsc: boolean
  setSortAsc: (val: boolean | ((prev: boolean) => boolean)) => void
  handleItemClick: (item: FileItem, e: React.MouseEvent) => void
  navigate: (path: string) => void
  setPreviewTarget: (item: FileItem) => void
  handleContextMenu: (e: React.MouseEvent, item: FileItem) => void
  isInvestor?: boolean
  hideMoreOptions?: boolean
  isSearch?: boolean
}

export default function FilesList({
  folders,
  files,
  selected,
  sortBy,
  setSortBy,
  sortAsc,
  setSortAsc,
  handleItemClick,
  navigate,
  setPreviewTarget,
  handleContextMenu,
  isInvestor,
  hideMoreOptions,
  isSearch,
}: FilesListProps) {
  const toggleSort = (field: 'name' | 'size' | 'modified') => {
    if (sortBy === field) {
      setSortAsc((a) => !a)
    } else {
      setSortBy(field)
      setSortAsc(true)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] overflow-hidden shadow-soft">
      {/* Header hidden on mobile */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 tracking-wide select-none">
        <button
          className="col-span-7 text-left hover:text-gray-600 flex items-center gap-1 focus:outline-none"
          onClick={() => toggleSort('name')}
        >
          Name {sortBy === 'name' && <ArrowUpDown className="w-3 h-3 text-gray-400" />}
        </button>
        <button
          className="col-span-2 text-left hover:text-gray-600 flex items-center gap-1 focus:outline-none"
          onClick={() => toggleSort('size')}
        >
          Size {sortBy === 'size' && <ArrowUpDown className="w-3 h-3 text-gray-400" />}
        </button>
        <button
          className="col-span-2 text-left hover:text-gray-600 flex items-center gap-1 focus:outline-none"
          onClick={() => toggleSort('modified')}
        >
          Modified {sortBy === 'modified' && <ArrowUpDown className="w-3 h-3 text-gray-400" />}
        </button>
        <div className="col-span-1" />
      </div>

      {folders.length > 0 && (
        <>
          <div className="px-3 sm:px-6 py-2 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500">
            Folders
          </div>
          {folders.map((item) => (
            <FileListRow
              key={item.path}
              item={item}
              isSelected={selected.has(item.path)}
              onClick={(e) => handleItemClick(item, e)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                navigate(item.path)
              }}
              onContextMenu={(e) => handleContextMenu(e, item)}
              isInvestor={isInvestor}
              hideMoreOptions={hideMoreOptions}
              isSearch={isSearch}
            />
          ))}
        </>
      )}

      {files.length > 0 && (
        <>
          <div className="px-3 sm:px-6 py-2 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 border-t border-gray-100">
            Files
          </div>
          {files.map((item) => (
            <FileListRow
              key={item.path}
              item={item}
              isSelected={selected.has(item.path)}
              onClick={(e) => handleItemClick(item, e)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setPreviewTarget(item)
              }}
              onContextMenu={(e) => handleContextMenu(e, item)}
              isInvestor={isInvestor}
              hideMoreOptions={hideMoreOptions}
              isSearch={isSearch}
            />
          ))}
        </>
      )}
    </div>
  )
}
