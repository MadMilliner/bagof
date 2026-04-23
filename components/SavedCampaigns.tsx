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
import type { SavedSession } from '@/lib/savedSessions'

interface SavedCampaignsProps {
  sessions: SavedSession[]
  onCopy: (dmToken: string, sessionId: string) => void
  onRemove: (sessionId: string) => void
  copiedSessionId: string | null
}

export function SavedCampaigns({
  sessions,
  onCopy,
  onRemove,
  copiedSessionId,
}: SavedCampaignsProps) {
  if (sessions.length === 0) return null

  const items = sessions.map(session => ({
    icon: '🎒',
    title: session.sessionName,
    description: `Saved ${new Date(session.savedAt).toLocaleDateString()}`,
    badge: session.dmRole,
    children: (
      <div className='space-y-2'>
        <Link href={`/dm/${session.dmToken}`} className='block'>
          <Button
            id={`open-dm-dashboard-btn-${session.sessionId}`}
            size='sm'
            className='w-full h-fit whitespace-normal text-center'
          >
            Open {session.dmRole === 'Dungeon Master' ? 'DM' : session.dmRole === 'Game Master' ? 'GM' : session.dmRole} Dashboard
          </Button>
        </Link>
        <div className='flex gap-2'>
          <Button
            id={`copy-dm-link-btn-${session.sessionId}`}
            size='sm'
            variant='outline'
            className='flex-1'
            onClick={() => onCopy(session.dmToken, session.sessionId)}
          >
            {copiedSessionId === session.sessionId ? '✓ Copied!' : 'Copy Link'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size='sm' variant='destructive'>
                ✕
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove &quot;{session.sessionName}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This only removes the saved link from this device. The campaign still exists.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemove(session.sessionId)}>
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
    <div id='saved-campaigns-column' className='saved-campaigns-column flex-1 min-w-[280px]'>
      <Feature1
        title={`Your campaigns (${sessions.length})`}
        description='Click to open your DM dashboard or copy the link to share with others.'
        items={items}
        columns={3}
        inline
        className='flex-1 min-w-[280px]'
      />
    </div>
  )
}