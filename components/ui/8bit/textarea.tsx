import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full border-2 border-black dark:border-white bg-background px-3 py-2 text-xs font-press-start [box-shadow:2px_2px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:2px_2px_0px_0px_rgba(255,255,255,1)] focus:[box-shadow:none] focus:translate-x-[2px] focus:translate-y-[2px] placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
