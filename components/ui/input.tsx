import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

const inputVariants = cva(
  'w-full rounded-md border bg-slate-800/60 text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-slate-600 focus:border-violet-500 focus:ring-violet-500/20',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      },
      sz: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      sz: 'md',
    },
  },
)

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, sz, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ variant, sz }), className)}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input, inputVariants }
