'use client'
import { useEffect, useState } from 'react'
import { X, Download, Trash2, Share2, Edit2, ExternalLink, Save } from 'lucide-react'
import { clsx } from 'clsx'
import { formatBytes, getUser } from '@/lib/api'
import { ddmsDocumentsService, ddmsInvestorService } from '@/lib/services/ddmsService'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/ui/Button'
import { FileItem } from '@/types'

export default function FilePreviewModal({
  file, onClose, onDownload, onDelete, onShare, onRename, isSharedContext
}: {
  file: FileItem
  onClose: () => void
  onDownload: () => void
  onDelete?: () => void
  onShare?: () => void
  onRename?: () => void
  isSharedContext?: boolean
}) {
  const [textContent, setTextContent] = useState<string | null>(null)
  const [originalContent, setOriginalContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null)

  useEffect(() => { setUser(getUser()) }, [])

  // Load DDMS presigned URL for the document
  useEffect(() => {
    if (!file.path) return
    const isUserInvestor = user?.scope === 'investor'
    const fetchUrl = (isSharedContext || isUserInvestor)
      ? ddmsInvestorService.getDocumentUrl(file.path)
      : ddmsDocumentsService.getUrl(file.path)

    fetchUrl
      .then(r => setPresignedUrl(r.url))
      .catch(() => {})
  }, [file.path, isSharedContext, user])

  const handleSave = async () => {
    if (textContent === null) return
    setSaving(true)
    try {
      await ddmsDocumentsService.rename(file.path, { filename: file.name })
      toast.success('File saved successfully')
      setOriginalContent(textContent)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const ext = file.name?.split('.').pop()?.toLowerCase() || ''
  const isPdf = file.type === 'pdf' || ext === 'pdf'
  const isText = file.type === 'text' || ['txt', 'html', 'css', 'json', 'js', 'ts', 'tsx', 'md'].includes(ext)
  const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'csv'].includes(ext)
  const rawFileUrl = presignedUrl || ''
  const rawDownloadUrl = presignedUrl || ''

  useEffect(() => {
    if (isText && presignedUrl) {
      setLoading(true)
      fetch(presignedUrl)
        .then(r => r.text())
        .then(t => { setTextContent(t); setOriginalContent(t) })
        .catch(() => { setTextContent('Failed to load file content.'); setOriginalContent('') })
        .finally(() => setLoading(false))
    }
  }, [file.path, isText, presignedUrl])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in">
      <div className="bg-white sm:rounded-xl shadow-modal w-full sm:w-[80vw] sm:max-w-[80vw] h-[95vh] sm:h-[80vh] max-h-[95vh] sm:max-h-[80vh] flex flex-col animate-slide-up border-t sm:border border-[#e8eaed] rounded-t-2xl sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e8eaed] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-800 text-[15px] truncate" title={file.name}>{file.name}</h2>
            <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
              {formatBytes(file.size)} · Modified {file.modified ? formatDistanceToNow(new Date(file.modified), { addSuffix: true }) : 'never'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isText && user?.perm?.modify && textContent !== originalContent && textContent !== null && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 hover:text-green-600 transition-all focus:outline-none border border-green-200 bg-green-50/50 flex items-center gap-1 px-2.5 animate-pulse"
                title="Save Changes"
              >
                <Save className="w-4 h-4" />
                <span className="text-xs font-semibold">Save</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 rounded-b-xl min-h-0">
          {isPdf && rawFileUrl && (
            <div className="w-full h-full flex flex-col p-4">
              <iframe src={rawFileUrl} className="flex-1 rounded-lg border border-[#e8eaed] h-full bg-white" title={file.name} />
            </div>
          )}

          {isOffice && rawFileUrl && (
            <div className="w-full h-full flex flex-col p-4">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(rawFileUrl)}&embedded=true`}
                className="flex-1 rounded-lg border border-[#e8eaed] h-full bg-white"
                title={file.name}
              />
            </div>
          )}

          {isText && (
            <div className="w-full h-full p-4 flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : user?.perm?.modify ? (
                <textarea
                  value={textContent || ''}
                  onChange={e => setTextContent(e.target.value)}
                  className="w-full flex-1 h-full bg-white rounded-lg border border-[#e8eaed] p-4 text-xs text-gray-700 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none text-left"
                  autoFocus
                />
              ) : (
                <pre className="bg-white rounded-lg border border-[#e8eaed] p-4 text-xs text-gray-700 overflow-auto flex-1 h-full font-mono leading-relaxed whitespace-pre-wrap break-words text-left w-full">
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {!isPdf && !isText && !isOffice && (
            <div className="text-center p-12">
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4 border border-[#e8eaed]">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">No preview available</p>
              <p className="text-xs text-gray-400">{file.mimeType || 'Binary file'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
