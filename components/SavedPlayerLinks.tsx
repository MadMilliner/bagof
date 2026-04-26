'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/8bit/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/8bit/accordion'
import { Feature1 } from '@/components/ui/8bit/blocks/feature1'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/8bit/alert-dialog'
import type { SavedPlayerLink } from '@/lib/savedSessions'
import { LuCheck, LuLink, LuSwords, LuX } from 'react-icons/lu'

interface SavedPlayerLinksProps {
  playerLinks: SavedPlayerLink[]
  onCopy: (memberToken: string, memberId: string) => void
  onRemove: (memberId: string) => void
  copiedPlayerId: string | null
}

export function SavedPlayerLinks({
  playerLinks,
  onCopy,
  onRemove,
  copiedPlayerId,
}: SavedPlayerLinksProps) {
  if (playerLinks.length === 0) return null

  const items = playerLinks.map(link => ({
    icon: <LuSwords className="inline-block h-6 w-6" aria-hidden="true" />,
    title: link.memberName,
    description: `${link.dmRole === 'Dungeon Master' ? 'DM' : link.dmRole === 'Game Master' ? 'GM' : link.dmRole} campaign · Saved ${new Date(link.savedAt).toLocaleDateString()}`,
    badge: link.sessionName,
    children: (
      <div className='space-y-2'>
        <Link href={`/p/${link.memberToken}`} prefetch={false} className='block'>
          <Button
            id={`open-player-dashboard-btn-${link.memberId}`}
            size='sm'
            variant='secondary'
            className='w-full h-auto min-h-9 py-2 leading-relaxed whitespace-normal text-center'
          >
            Open Inventory
          </Button>
        </Link>
        <div className='flex gap-2'>
          <Button
            id={`copy-player-link-btn-${link.memberId}`}
            size='sm'
            variant='outline'
            className='w-full min-w-0'
            onClick={() => onCopy(link.memberToken, link.memberId)}
          >
            {copiedPlayerId === link.memberId ? (
              <span className="inline-flex items-center gap-1">
                <LuCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Copied!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <LuLink className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Link
              </span>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size='icon' variant='destructive' className='shrink-0' aria-label={`Remove ${link.memberName}`}>
                <LuX className="h-4 w-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove &quot;{link.memberName}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This only removes the saved link from this device. The character still exists.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemove(link.memberId)}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    ),
  }))

  return (
    <div id='saved-characters-column' className='saved-characters-column min-w-0'>
      <Accordion type='single' collapsible className='w-full'>
        <AccordionItem value='characters'>
          <AccordionTrigger className='text-left'>
            <div className='flex items-center gap-2'>
              <LuSwords className="h-4 w-4" aria-hidden="true" />
              <span className='font-press-start text-xs'>Your characters ({playerLinks.length})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className='font-press-start text-[10px] text-muted-foreground mb-4'>
              Click to open your character sheet or copy the link to share with others.
            </p>
            <Feature1
              items={items}
              columns={2}
              inline
              className='min-w-0'
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}