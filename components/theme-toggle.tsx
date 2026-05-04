"use client"

import * as React from "react"
import { Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ThemeToggleProps = {
  className?: string
}

function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === "dark" : false

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "size-9 rounded-full border border-slate-200 bg-white p-0 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
        className,
      )}
    >
      {isDark ? (
        <SunMedium className="size-3.5" aria-hidden="true" />
      ) : (
        <Moon className="size-3.5" aria-hidden="true" />
      )}
      <span className="sr-only">{isDark ? "Dark mode" : "Light mode"}</span>
    </Button>
  )
}

export { ThemeToggle }
