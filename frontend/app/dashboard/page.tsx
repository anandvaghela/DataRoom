'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (user?.scope === 'investor') {
      router.replace('/dashboard/investor')
    } else {
      router.replace('/dashboard/files')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}
