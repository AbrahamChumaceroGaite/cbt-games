import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-violet-600/20 text-violet-300 border border-violet-600/30',
        platform: 'bg-slate-700 text-slate-300 border border-slate-600',
        genre: 'bg-blue-600/20 text-blue-300 border border-blue-600/30',
        year: 'bg-amber-600/20 text-amber-300 border border-amber-600/30',
        success: 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
