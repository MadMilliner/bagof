import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full border-2 border-black dark:border-white bg-background px-3 py-1 text-xs font-press-start shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:2px_2px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:2px_2px_0px_0px_rgba(255,255,255,1)] focus:[box-shadow:none] focus:translate-x-[2px] focus:translate-y-[2px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
