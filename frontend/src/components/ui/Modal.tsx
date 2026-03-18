'use client'

import React from 'react'
import { X } from 'lucide-react'
import { cn } from './utils'
import { Button } from './Button'

type ModalProps = {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, title, onClose, children, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className={cn('w-full max-w-2xl rounded-2xl bg-white shadow-xl', className)}>
        <div className="flex items-center justify-between border-b border-brand-pale p-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </Button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
