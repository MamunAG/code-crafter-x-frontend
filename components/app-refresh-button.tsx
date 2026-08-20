import React, { ComponentProps } from "react"
import { Button } from "./ui/button"
import { Plus, RefreshCcw } from "lucide-react"

type AppRefreshButtonProps = ComponentProps<typeof Button> & {
  title: string
  triggerRefresh: () => void
}

export default function AppRefreshButton({
  title,
  triggerRefresh,
  className,
  ...props
}: AppRefreshButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={triggerRefresh}
      className={`h-7 rounded-xl ${className ?? ""}`}
      {...props}
    >
      <RefreshCcw className="size-3.5" />
      {title}
    </Button>
  )
}
