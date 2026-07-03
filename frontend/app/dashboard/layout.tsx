'use client'
import AppLayout from '@/components/layout/AppLayout'

interface DashboardLayoutProps {
  readonly children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <AppLayout>{children}</AppLayout>
}
