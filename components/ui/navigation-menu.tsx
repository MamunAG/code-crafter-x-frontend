"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cva } from "class-variance-authority"
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function NavigationMenu({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn(
        "relative z-10 flex max-w-max flex-1 items-center justify-center",
        className,
      )}
      {...props}
    />
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 items-center justify-center rounded-full bg-transparent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-slate-900 data-[state=open]:text-white dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white dark:data-[state=open]:bg-white dark:data-[state=open]:text-slate-900",
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "gap-1", className)}
      {...props}
    >
      {children}
      <ChevronDown className="relative top-px h-3.5 w-3.5 transition duration-200 group-data-[state=open]:rotate-180" />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "absolute left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in-0 data-[motion^=to-]:fade-out-0 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52",
        className,
      )}
      {...props}
    />
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "block select-none rounded-xl p-3 no-underline outline-none transition-colors hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white",
        className,
      )}
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className={cn("absolute left-0 top-full w-full flex justify-center")}>
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "relative mt-2 h-[var(--radix-navigation-menu-viewport-height)] w-[min(980px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-2 text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-100",
          className,
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:fade-in-0",
        className,
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-white shadow-md dark:bg-slate-950" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
