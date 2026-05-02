import * as React from "react"
import { type BitProgressProps, Progress } from "@/components/ui/8bit/progress"
import { cn } from "@/lib/utils"

interface XpBarProps extends Omit<React.ComponentProps<"div">, "children"> {
  className?: string
  progressProps?: Omit<BitProgressProps, "value" | "variant" | "progressBg">
  variant?: "retro" | "default"
  value?: number
  levelUpMessage?: string
  progressBg?: string
}

export default function XpBar({
  className,
  variant,
  value,
  levelUpMessage = "LEVEL UP!",
  progressBg = "bg-yellow-500",
  progressProps,
  ...divProps
}: XpBarProps) {
  const isLevelUp = value === 100
  const { className: progressClassName, ...restProgressProps } = progressProps ?? {}

  return (
    <div className={cn("relative", className)} {...divProps}>
      <Progress
        {...restProgressProps}
        value={value}
        variant={variant}
        className={cn("w-full", isLevelUp && "animate-pulse", progressClassName)}
        progressBg={progressBg}
      />
      {isLevelUp && (
        <div
          className={cn(
            "retro",
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "text-[0.625rem] text-black",
            "pointer-events-none whitespace-nowrap z-10",
            "drop-shadow-[1px_1px_0_#fff] [text-shadow:1px_1px_0_#fff,-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff]",
            "animate-[blink_0.5s_step-end_infinite]"
          )}
        >
          {levelUpMessage}
        </div>
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
