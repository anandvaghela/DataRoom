'use client'

interface UploadProgressProps {
  uploading: Record<string, number>
}

export default function UploadProgress({ uploading }: UploadProgressProps) {
  if (Object.keys(uploading).length === 0) return null

  return (
    <div className="bg-white border-b border-[#e8eaed] px-6 py-2 space-y-1">
      {Object.entries(uploading).map(([name, pct]) => (
        <div key={name} className="flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate flex-1">{name}</span>
          <div className="w-24 bg-gray-100 rounded-full h-1.5">
            <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-8 text-right">{pct}%</span>
        </div>
      ))}
    </div>
  )
}
