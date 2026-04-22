import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

const cardVariants = cva('rounded-xl border transition-colors', {
  variants: {
    variant: {
      default: 'border-slate-700 bg-slate-800/60',
      elevated: 'border-slate-600 bg-slate-800 shadow-xl shadow-black/40',
      interactive:
        'border-slate-700 bg-slate-800/60 hover:border-violet-500/50 hover:bg-slate-800 cursor-pointer group',
      glass: 'border-white/10 bg-white/5 backdrop-blur-sm',
    },
    p: {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    p: 'md',
  },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, p, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, p }), className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-white', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-400', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-3', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4 flex items-center justify-between gap-2', className)} {...props} />
  )
}
