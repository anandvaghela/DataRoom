'use client'
import { X, Share2, Copy, ExternalLink } from 'lucide-react'
import { useDDMSDocumentUrl } from '@/lib/hooks/useDDMS'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

export default function ShareModal({ file, onClose }: { file: any; onClose: () => void }) {
  const isDir = !!file.isDir

  // Fetch presigned document url (disabled if it is a directory)
  const { data: urlData, isLoading, error } = useDDMSDocumentUrl(file.path, !isDir)

  const shareUrl = isDir
    ? `${window.location.origin}/dashboard/files?path=${encodeURIComponent(file.path)}`
    : urlData?.url || ''

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success('Copied!'))
      .catch(() => toast.error('Copy failed'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-md animate-slide-up border border-[#e8eaed]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eaed]">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary-500" />
            <h2 className="font-bold text-gray-800 text-[15px]">Share "{file.name}"</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Generating share link...</span>
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 text-center py-6">Failed to generate pre-signed URL.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                {isDir
                  ? 'Copy the link below to share this folder with users who have access permissions.'
                  : 'Copy the short-lived pre-signed URL below to share this file directly.'}
              </p>
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-[#e8eaed] hover:border-gray-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-gray-600 truncate font-semibold">
                    {shareUrl}
                  </p>
                  {!isDir && urlData?.expires_at && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Expires: {new Date(urlData.expires_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={copyLink}
                    className="p-1.5 rounded-lg hover:bg-gray-150 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    title="Copy Link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-gray-150 text-gray-400 hover:text-primary-500 transition-colors focus:outline-none"
                    title="Open Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
