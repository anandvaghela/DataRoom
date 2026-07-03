'use client'
import { useEffect, useState } from 'react'
import { getUser } from '@/lib/api'
import ProfileSettings from './ProfileSettings'

export default function SettingsPageContent() {
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    setCurrentUser(getUser())
  }, [])

  if (!currentUser) return null

  return (
    <div className="p-4 sm:p-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-[#f0f0f0] mb-6 overflow-x-auto whitespace-nowrap">
        <button
          className="px-5 py-3 text-sm font-bold border-b-2 border-[#007aff] text-[#007aff] focus:outline-none"
        >
          Profile Settings
        </button>
      </div>

      <ProfileSettings currentUser={currentUser} />
    </div>
  )
}
