'use client'
import { useState } from 'react'
import { X, Share2, Mail } from 'lucide-react'
import { useDDMSDocumentUrl } from '@/lib/hooks/useDDMS'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ShareModal({ file, onClose }: { file: any; onClose: () => void }) {
  const isDir = !!file.isDir
  const [email, setEmail] = useState('')
  const [sharing, setSharing] = useState(false)

  // Fetch presigned document url (disabled if it is a directory)
  const { data: urlData, isLoading, error } = useDDMSDocumentUrl(file.path, !isDir)

  const shareUrl = isDir
    ? `${window.location.origin}/dashboard/files?path=${encodeURIComponent(file.path)}`
    : urlData?.url || ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    setSharing(true)
    try {
      // Mock API call to share link via email (actual integration to be implemented later)
      console.log('Sharing document link via email:', {
        email: trimmedEmail,
        fileId: file.path,
        fileName: file.name,
        shareUrl,
      })

      // Simulate network request delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success(`Share link sent to ${trimmedEmail} successfully!`)
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send share link')
    } finally {
      setSharing(false)
    }
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
        <div className="p-6">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Generating share link...</span>
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 text-center py-6">Failed to generate pre-signed URL.</p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <p className="text-xs text-gray-500 leading-relaxed">
                Enter the recipient's email address below to send them a secure link to access this file.
              </p>
              
              <Input
                type="email"
                label="Email Address"
                placeholder="recipient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                prefixIcon={<Mail className="w-4 h-4 text-gray-400" />}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={sharing} disabled={!email.trim()} className="flex-1">
                  Send Link
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
