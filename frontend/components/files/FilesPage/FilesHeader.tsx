'use client'
import { Home, List, Grid3X3, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface BreadcrumbItem {
  label: string
  path: string
}

interface FilesHeaderProps {
  breadcrumb: BreadcrumbItem[]
  onNavigate: (path: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
}

export default function FilesHeader({
  breadcrumb,
  onNavigate,
  viewMode,
  setViewMode,
}: FilesHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-100 px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0 flex-1 overflow-hidden">
        <button
          onClick={() => onNavigate('/')}
          className="hover:text-blue-600 transition-colors focus:outline-none flex-shrink-0"
          title="Home"
        >
          <Home className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600 transition-colors" />
        </button>
        <span className="text-gray-300 flex-shrink-0">/</span>
        
        <button
          onClick={() => onNavigate('/')}
          className={clsx(
            "hover:text-blue-600 transition-colors flex-shrink-0",
            breadcrumb.length <= 1 ? "font-semibold text-gray-800" : "text-gray-400"
          )}
        >
          Home
        </button>

        {breadcrumb.length > 1 && (
          <>
            <span className="text-gray-300 flex-shrink-0">/</span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
              {breadcrumb.filter(b => b.path !== '/').map((b, i, arr) => (
                <span key={b.path} className="flex items-center gap-1 min-w-0 flex-shrink-0">
                  {i > 0 && <span className="text-gray-300 flex-shrink-0">/</span>}
                  <button
                    onClick={() => onNavigate(b.path)}
                    className={clsx(
                      'hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-[180px] md:max-w-none flex-shrink-0',
                      i === arr.length - 1 ? 'font-semibold text-gray-800' : 'text-gray-400'
                    )}
                  >
                    {b.label}
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View mode toggle pill */}
      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden h-7 select-none bg-white shadow-sm">
        <button
          onClick={() => setViewMode('list')}
          className={clsx(
            "h-full px-3 flex items-center justify-center gap-1 transition-colors focus:outline-none border-r border-gray-150 text-[11px]",
            viewMode === 'list'
              ? "bg-[#deeeff] text-[#0062cc] font-semibold"
              : "bg-white text-gray-500 hover:text-gray-700"
          )}
          title="List view"
        >
          {viewMode === 'list' && <Check className="w-2.5 h-2.5 text-[#0062cc]" />}
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={clsx(
            "h-full px-3 flex items-center justify-center gap-1 transition-colors focus:outline-none text-[11px]",
            viewMode === 'grid'
              ? "bg-[#deeeff] text-[#0062cc] font-semibold"
              : "bg-white text-gray-500 hover:text-gray-700"
          )}
          title="Grid view"
        >
          {viewMode === 'grid' && <Check className="w-2.5 h-2.5 text-[#0062cc]" />}
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
