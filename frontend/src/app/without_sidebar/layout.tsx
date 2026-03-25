'use client'

import React from 'react'
import { ToastProvider } from '@/components/ui'
import EnterpriseTopNav from '@/components/chat/EnterpriseTopNav'

export default function WithoutSidebarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <EnterpriseTopNav />
        <main className="flex h-[calc(100dvh-64px)] min-h-0 p-6">{children}</main>
      </div>
    </ToastProvider>
  )
}
