import Link from 'next/link'
import { LuHouse } from 'react-icons/lu'
import { Separator } from '@/components/ui/8bit/separator'

interface BagOfLogoProps {
  variant?: 'default' | 'large'
}

export function BagOfLogo({ variant = 'default' }: BagOfLogoProps) {
  if (variant === 'large') {
    return (
      <div className="inline-flex flex-col items-start gap-1.5 mb-2">
        <h1 className="font-press-start text-xl">
          <Link
            href="/"
            id="bag-of-logo"
            aria-label="Go to home page"
            title="Go to home"
            className="inline-flex items-center gap-2 cursor-pointer rounded-sm px-1 py-0.5 text-foreground/90 hover:text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-200 group"
          >
            <LuHouse className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
              Bag of
            </span>
          </Link>
        </h1>
        <Separator className="w-24" />
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Link
        href="/"
        id="bag-of-logo"
        aria-label="Go to home page"
        title="Go to home"
        className="font-press-start text-8bit-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-sm px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-200 group inline-flex items-center gap-1.5 cursor-pointer"
      >
        <LuHouse className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
          Bag of
        </span>
      </Link>
      <Separator className="w-16" />
    </div>
  )
}
