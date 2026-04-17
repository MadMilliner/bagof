import Link from 'next/link'

interface BagOfLogoProps {
  variant?: 'default' | 'large'
}

export function BagOfLogo({ variant = 'default' }: BagOfLogoProps) {
  if (variant === 'large') {
    return (
      <h1 className="font-press-start text-xl mb-2">
        <Link
          href="/"
          id="bag-of-logo"
          className="inline-block hover:text-muted-foreground transition-colors duration-200 group"
        >
          <span className="inline-block transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
            Bag of
          </span>
        </Link>
      </h1>
    )
  }

  return (
    <Link
      href="/"
      id="bag-of-logo"
      className="font-press-start text-8bit-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group inline-flex items-center gap-1"
    >
      <span className="inline-block transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
        Bag of
      </span>
    </Link>
  )
}
