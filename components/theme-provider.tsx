"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { MENU_SEARCH_OPEN_EVENT, isTypingTarget } from "@/lib/app-hotkeys"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      <MenuSearchHotkey />
      {children}
    </NextThemesProvider>
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      const key = typeof event.key === "string" ? event.key.toLowerCase() : ""

      if (key !== "d") {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

function MenuSearchHotkey() {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (!event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      const key = typeof event.key === "string" ? event.key.toLowerCase() : ""
      const isSearchShortcut =
        (key === "s" && !event.shiftKey) ||
        (key === "f" && event.shiftKey)

      if (!isSearchShortcut) {
        return
      }

      event.preventDefault()
      window.dispatchEvent(new Event(MENU_SEARCH_OPEN_EVENT))
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return null
}

export { ThemeProvider }
