import { CreateSessionForm } from '@/components/CreateSessionForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bag of',
}

export default function HomePage()
{
  return (
    <main id="home-page" className="min-h-[calc(100vh-15dvh)] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl mx-auto">
        <CreateSessionForm />
      </div>
    </main>
  )
}
