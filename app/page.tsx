import { CreateSessionForm } from '@/components/CreateSessionForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bag of',
}

export default function HomePage()
{
  return (
    <main id="home-page" className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl mx-auto">
        <CreateSessionForm />
      </div>
    </main>
  )
}
