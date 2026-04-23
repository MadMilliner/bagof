'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/8bit/button'
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
    icon: '⚔️',
    title: link.memberName,
    description: `${link.dmRole === 'Dungeon Master' ? 'DM' : link.dmRole === 'Game Master' ? 'GM' : link.dmRole} campaign · Saved ${new Date(link.savedAt).toLocaleDateString()}`,
    badge: link.sessionName,
    children: (
      <div className='space-y-2'>
        <Link href={`/p/${link.memberToken}`} className='block'>
          <Button
            id={`open-player-dashboard-btn-${link.memberId}`}
            size='sm'
            variant='secondary'
            className='w-full h-fit whitespace-normal text-center'
          >
            Open Character Sheet
          </Button>
        </Link>
        <div className='flex gap-2'>
          <Button
            id={`copy-player-link-btn-${link.memberId}`}
            size='sm'
            variant='outline'
            className='flex-1'
            onClick={() => onCopy(link.memberToken, link.memberId)}
          >
            {copiedPlayerId === link.memberId ? '✓ Copied!' : 'Copy Link'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size='sm' variant='destructive'>
                ✕
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
    <div id='saved-characters-column' className='saved-characters-column flex-1 min-w-[280px]'>
      <Feature1
        title={`Your characters (${playerLinks.length})`}
        description='Click to open your character sheet or copy the link to share with others.'
        items={items}
        columns={3}
        inline
        className='flex-1 min-w-[280px]'
      />
    </div>
  )
}