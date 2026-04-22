'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { HTMLAttributes, ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

// ─── Panel variants ───────────────────────────────────────────────────────────
const modalPanelVariants = cva(
  'relative z-50 flex flex-col rounded-2xl border shadow-2xl shadow-black/70 w-full animate-in fade-in zoom-in-95 duration-150',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
      },
      variant: {
        default: 'border-slate-700 bg-slate-900',
        danger:  'border-red-700/60 bg-slate-900',
        success: 'border-emerald-700/60 bg-slate-900',
        warning: 'border-amber-700/60 bg-slate-900',
      },
    },
    defaultVariants: { size: 'md', variant: 'default' },
  },
)

// ─── Root ─────────────────────────────────────────────────────────────────────
interface ModalProps extends VariantProps<typeof modalPanelVariants> {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Prevent closing on backdrop click */
  persistent?: boolean
  className?: string
}

export function Modal({ isOpen, onClose, children, persistent, size, variant, className }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !persistent) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, persistent])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={persistent ? undefined : onClose}
      />
      {/* Panel */}
      <div className={cn(modalPanelVariants({ size, variant }), className)}>
        {children}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
export function ModalHeader({
  className,
  title,
  onClose,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string; onClose?: () => void }) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 px-6 pt-6 pb-0', className)}
      {...props}
    >
      {title && (
        <h2 className="text-lg font-semibold text-white leading-tight">{title}</h2>
      )}
      {props.children}
      {onClose && (
        <Button variant="ghost" sz="icon" className="shrink-0 -mt-1 -mr-1" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4 text-slate-300 text-sm', className)} {...props} />
}

export function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 px-6 pb-6 pt-2', className)}
      {...props}
    />
  )
}
