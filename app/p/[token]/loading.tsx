import { Spinner } from '@/components/ui/8bit/spinner'

export default function PlayerLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Spinner variant="diamond" className="size-8" />
    </div>
  )
}
