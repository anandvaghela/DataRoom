'use client'
import { Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'

interface DashboardLayoutProps {
  readonly children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={null}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  )
}
