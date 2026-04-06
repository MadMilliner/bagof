'use client'

import { Card, CardContent } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import type { Item } from '@/types'


const URL_REGEX = /(https?:\/\/[^\s]+)/g

function linkify(text: string) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-blue-600 dark:text-blue-400 break-all"
      >
        {part}
      </a>
    ) : (
      part
    )
  )
}

const TYPE_ICONS: Record<Item['type'], string> = {
  Weapon: '⚔️',
  Armor: '🛡️',
  Consumable: '🧪',
  Other: '📦',
}

const TYPE_VARIANT: Record<Item['type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Weapon: 'destructive',
  Armor: 'default',
  Consumable: 'secondary',
  Other: 'outline',
}

interface ItemCardProps {
  item: Item
  viewerIsOwner?: boolean
  viewerIsDM?: boolean
  onClaim?: (item: Item) => void
  onOffer?: (item: Item) => void
  onTogglePrivate?: (item: Item) => void
  onDelete?: (item: Item) => void
}

export function ItemCard({
  item,
  viewerIsOwner,
  viewerIsDM,
  onClaim,
  onOffer,
  onTogglePrivate,
  onDelete,
}: ItemCardProps) {
  const isInPool = item.ownerId === null

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{TYPE_ICONS[item.type]}</span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-press-start text-xs text-foreground leading-tight">
                {item.name}
                {item.quantity > 1 && (
                  <span className="text-muted-foreground"> ×{item.quantity}</span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={TYPE_VARIANT[item.type]}>{item.type}</Badge>
              {item.private && <Badge variant="outline">🔒 Private</Badge>}
              {isInPool && <Badge variant="secondary">Party Bag</Badge>}
            </div>

            {item.description && (
              <p className="font-press-start text-[10px] text-muted-foreground leading-relaxed mb-2">
                {linkify(item.description)}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {isInPool && onClaim && (
                <Button size="sm" onClick={() => onClaim(item)}>
                  Claim
                </Button>
              )}

              {viewerIsOwner && (
                <>
                  {onOffer && !isInPool && (
                    <Button size="sm" variant="secondary" onClick={() => onOffer(item)}>
                      Offer to Party
                    </Button>
                  )}
                  {onTogglePrivate && (
                    <Button size="sm" variant="outline" onClick={() => onTogglePrivate(item)}>
                      {item.private ? 'Make Public' : 'Make Private'}
                    </Button>
                  )}
                  {onDelete && (
                    <Button size="sm" variant="destructive" onClick={() => onDelete(item)}>
                      Drop
                    </Button>
                  )}
                </>
              )}

              {viewerIsDM && !viewerIsOwner && onDelete && (
                <Button size="sm" variant="destructive" onClick={() => onDelete(item)}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
