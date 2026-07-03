'use client'
import { useState, useMemo } from 'react'
import { X, Users, Trash2, Calendar, Shield } from 'lucide-react'
import { useGrantDDMSPermission, useRevokeDDMSPermission, useDDMSInvestors } from '@/lib/hooks/useDDMS'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FileItem } from '@/types'

interface SessionGrant {
  id: string
  grantedTo: string
  expiresAt?: string
}

export default function ShareWithUsersModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [recipient, setRecipient] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [sessionGrants, setSessionGrants] = useState<SessionGrant[]>([])

  const grantMutation = useGrantDDMSPermission()
  const revokeMutation = useRevokeDDMSPermission()
  const { data: investorsList, isLoading: loadingInvestors } = useDDMSInvestors()

  const investorOptions = useMemo(() => {
    const list = Array.isArray(investorsList) ? investorsList : []
    const options = list.map((inv: any) => {
      const val = inv.username || inv._id || inv.id || ''
      const label = inv.username ? `${inv.username} (${inv.email || inv._id || inv.id})` : inv.email || inv._id || inv.id || ''
      return { value: val, label }
    })
    return [
      { value: '', label: loadingInvestors ? 'Loading investors...' : 'Select an investor...' },
      ...options
    ]
  }, [investorsList, loadingInvestors])

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipient.trim()) {
      toast.error('Please select an investor')
      return
    }

    const isoExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : undefined

    const body = {
      granted_to: recipient.trim(),
      expires_at: isoExpiresAt,
      [file.isDir ? 'folder_id' : 'document_id']: file.path,
    }

    const selectedInvestor = Array.isArray(investorsList)
      ? investorsList.find((inv: any) => (inv.username || inv._id || inv.id) === recipient)
      : null
    const displayName = selectedInvestor?.username || recipient.trim()

    grantMutation.mutate(body, {
      onSuccess: (data: any) => {
        toast.success(`Access granted to ${displayName}`)
        setSessionGrants((prev) => [
          ...prev,
          {
            id: data?.id || Math.random().toString(),
            grantedTo: displayName,
            expiresAt: isoExpiresAt,
          },
        ])
        setRecipient('')
        setExpiresAt('')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to grant access')
      },
    })
  }

  const handleRevoke = (grantId: string, username: string) => {
    revokeMutation.mutate(grantId, {
      onSuccess: () => {
        toast.success(`Access revoked for ${username}`)
        setSessionGrants((prev) => prev.filter((g) => g.id !== grantId))
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to revoke access')
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up border border-gray-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-[16px] leading-tight">Manage Access</h2>
              <p className="text-xs text-gray-400 mt-0.5 max-w-[280px] truncate">"{file.name}"</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <form onSubmit={handleGrant} className="p-6 space-y-5 flex-1">
          <div className="space-y-4">
            <Select
              label="Recipient Investor"
              options={investorOptions}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />

            <Input
              type="datetime-local"
              label="Expiration Date (optional)"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            loading={grantMutation.isPending}
            icon={<Shield className="w-4 h-4" />}
            className="w-full"
          >
            Grant Access
          </Button>
        </form>

        {/* Session history */}
        {sessionGrants.length > 0 && (
          <div className="px-6 pb-6 flex-1 border-t border-gray-50 pt-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Granted in this session
            </h3>
            <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
              {sessionGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {grant.grantedTo}
                    </p>
                    {grant.expiresAt && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Expires: {new Date(grant.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(grant.id, grant.grantedTo)}
                    disabled={revokeMutation.isPending}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Revoke access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
