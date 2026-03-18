import React from 'react'
import { cn } from './utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  rightIcon?: React.ReactNode
}

export function Input({ label, error, hint, rightIcon, className, id, ...props }: InputProps) {
  const inputId = id || props.name

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
            rightIcon ? 'pr-10' : '',
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : '',
            className
          )}
          {...props}
        />
        {rightIcon && <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">{rightIcon}</div>}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}
