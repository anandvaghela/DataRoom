'use client'
import { FileItem } from '@/types'
import FileGridCard from '../FileGridCard'

interface FilesGridProps {
  folders: FileItem[]
  files: FileItem[]
  selected: Set<string>
  handleItemClick: (item: FileItem, e: React.MouseEvent) => void
  navigate: (path: string) => void
  setPreviewTarget: (item: FileItem) => void
  handleContextMenu: (e: React.MouseEvent, item: FileItem) => void
  isInvestor?: boolean
  hideMoreOptions?: boolean
  isSearch?: boolean
}

export default function FilesGrid({
  folders,
  files,
  selected,
  handleItemClick,
  navigate,
  setPreviewTarget,
  handleContextMenu,
  isInvestor,
  hideMoreOptions,
  isSearch,
}: FilesGridProps) {
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {folders.map((item) => (
              <FileGridCard
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
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Files</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {files.map((item) => (
              <FileGridCard
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
          </div>
        </div>
      )}
    </div>
  )
}
