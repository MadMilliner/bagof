import * as React from 'react'
import { cn } from '@/lib/utils'

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal'
          ? 'h-[2px] w-full border-y border-black/40 dark:border-white/40'
          : 'h-full w-[2px] border-x border-black/40 dark:border-white/40',
        className
      )}
      {...props}
    />
  )
}
