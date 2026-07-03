'use client'
import { Suspense } from 'react'
import { RefreshCw } from 'lucide-react'
import InvestorFilesContent from '@/components/files/InvestorFilesContent'

export default function InvestorDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    }>
      <InvestorFilesContent />
    </Suspense>
  )
}
