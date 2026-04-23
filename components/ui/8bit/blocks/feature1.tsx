import * as React from 'react'
import { cn } from '@/lib/utils'

interface FeatureItem {
  icon: string
  title: string
  description: string
  badge?: string
  children?: React.ReactNode
}

interface Feature1Props {
  title?: string
  description?: string
  items: FeatureItem[]
  columns?: 3 | 6 | 9
  className?: string
  /** When true, removes section wrapper and container padding for embedding in smaller contexts */
  inline?: boolean
}

export function Feature1({
  title = 'Game Features',
  description = 'Everything you need to manage your party loot and track your adventures.',
  items,
  columns = 3,
  className,
  inline = false,
}: Feature1Props) {
  const gridClass = cn(
    'grid gap-4',
    columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    columns === 6 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    columns === 9 && 'grid-cols-3 md:grid-cols-4 lg:grid-cols-9'
  )

  if (inline) {
    return (
      <div className={className}>
        {title && (
          <h2 className='font-press-start text-8bit-sm text-muted-foreground mb-3'>
            {title}
          </h2>
        )}
        <div className={gridClass}>
          {items.map((item, index) => (
            <div
              key={index}
              className='flex flex-col items-center text-center p-4 border-2 border-black dark:border-white bg-card text-card-foreground [box-shadow:3px_3px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:3px_3px_0px_0px_rgba(255,255,255,1)]'
            >
              <div className='text-2xl mb-2'>{item.icon}</div>
              <h3 className='font-press-start text-xs mb-1'>{item.title}</h3>
              <p className='font-press-start text-[10px] text-muted-foreground leading-relaxed'>
                {item.description}
              </p>
              {item.badge && (
                <span className='mt-2 inline-flex items-center rounded-none border border-black dark:border-white bg-muted px-1.5 py-0.5 font-press-start text-[8px]'>
                  {item.badge}
                </span>
              )}
              {item.children && (
                <div className='mt-3 w-full'>
                  {item.children}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className={cn('py-12 md:py-24 lg:py-32', className)}>
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col items-center justify-center text-center'>
          <h2 className='font-press-start text-2xl md:text-3xl lg:text-4xl tracking-tighter text-primary'>
            {title}
          </h2>
          <p className='max-w-[700px] font-press-start text-xs md:text-sm text-muted-foreground mt-4 leading-relaxed'>
            {description}
          </p>
        </div>
        <div
          className={cn('grid gap-6 py-12', gridClass)}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className='flex flex-col items-center text-center p-6 border-2 border-black dark:border-white bg-card text-card-foreground [box-shadow:4px_4px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:4px_4px_0px_0px_rgba(255,255,255,1)]'
            >
              <div className='text-4xl mb-4'>{item.icon}</div>
              <h3 className='font-press-start text-sm mb-2'>{item.title}</h3>
              <p className='font-press-start text-[10px] text-muted-foreground leading-relaxed'>
                {item.description}
              </p>
              {item.badge && (
                <span className='mt-4 inline-flex items-center rounded-none border-2 border-black dark:border-white bg-primary px-2 py-1 font-press-start text-[10px] text-primary-foreground'>
                  {item.badge}
                </span>
              )}
              {item.children && (
                <div className='mt-4 w-full'>
                  {item.children}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}