'use client'
import { useState, useMemo } from 'react'
import { X, Users, Trash2, Shield } from 'lucide-react'
import { useGrantDDMSPermission, useRevokeDDMSPermission, useDDMSInvestors, useDDMSPermissions } from '@/lib/hooks/useDDMS'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FileItem } from '@/types'

export default function ShareWithUsersModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [recipient, setRecipient] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const grantMutation = useGrantDDMSPermission()
  const revokeMutation = useRevokeDDMSPermission(file.path)
  const { data: investorsList, isLoading: loadingInvestors } = useDDMSInvestors()
  const { data: activePermissions, isLoading: loadingPermissions } = useDDMSPermissions({
    [file.isDir ? 'folder_id' : 'document_id']: file.path,
  })

  const investorOptions = useMemo(() => {
    const list = Array.isArray(investorsList) ? investorsList : []

    // Set of cognito_subs of investors who already have access
    const grantedSubSet = new Set<string>()

    if (Array.isArray(activePermissions)) {
      activePermissions.forEach((p: any) => {
        if (p.has_permission && p.cognito_sub) {
          grantedSubSet.add(String(p.cognito_sub).trim())
        }
      })
    }

    // Filter out investors who already have access
    const filteredList = list.filter((inv: any) => {
      const sub = inv.cognito_sub || ''
      return !grantedSubSet.has(String(sub).trim())
    })

    const options = filteredList.map((inv: any) => {
      const val = inv.cognito_sub || ''
      const name = [inv.first_name, inv.last_name].filter(Boolean).join(' ')
      const label = name || inv.email || inv.cognito_id || inv.username || inv.id || ''
      return { value: val, label }
    })

    return [
      { value: '', label: loadingInvestors ? 'Loading investors...' : 'Select an investor...' },
      ...options
    ]
  }, [investorsList, loadingInvestors, activePermissions])

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
      ? investorsList.find((inv: any) => (inv.cognito_sub || '') === recipient)
      : null
    const name = selectedInvestor ? [selectedInvestor.first_name, selectedInvestor.last_name].filter(Boolean).join(' ') : ''
    const displayName = name || selectedInvestor?.email || recipient.trim()

    grantMutation.mutate(body, {
      onSuccess: () => {
        toast.success(`Access granted to ${displayName}`)
        setRecipient('')
        setExpiresAt('')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to grant access')
      },
    })
  }

  const handleRevoke = (grantId: string, displayName: string) => {
    revokeMutation.mutate(grantId, {
      onSuccess: () => {
        toast.success(`Access revoked for ${displayName}`)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to revoke access')
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up border border-gray-150 flex flex-col max-h-[90vh]">
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
        <form onSubmit={handleGrant} className="p-6 space-y-5 flex-shrink-0">
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

        {/* Permissions Lists */}
        <div className="px-6 pb-6 flex-1 border-t border-gray-50 pt-4 overflow-y-auto space-y-5 min-h-[150px]">
          {/* Active Permissions Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Active Permissions
            </h3>
            {loadingPermissions ? (
              <p className="text-xs text-gray-400 py-3 text-center animate-pulse">Loading active permissions...</p>
            ) : !activePermissions || activePermissions.filter((p) => p.has_permission && p.permission_id).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No active permissions found.</p>
            ) : (
              <div className="space-y-2.5 pr-1">
                {activePermissions.filter((p) => p.has_permission && p.permission_id).map((grant) => {
                  const name = [grant.first_name, grant.last_name].filter(Boolean).join(' ')
                  const displayName = name || grant.email || grant.cognito_sub
                  const permId = grant.permission_id || ''

                  return (
                    <div
                      key={permId}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {displayName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevoke(permId, displayName)}
                        disabled={revokeMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-2"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

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
