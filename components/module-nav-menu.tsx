"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OrganizationComboBox } from "@/components/organization-combobox"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { fetchMenuPermissions } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"
import { cn } from "@/lib/utils"
import {
  filterModuleNavigationByPermissions,
  MODULE_NAVIGATION,
  type ModuleLeafItem,
  type ModuleNavigationItem,
} from "@/lib/module-navigation"

type ModuleNavMenuProps = {
  current: ModuleNavigationItem["key"] | "home" | "account" | "profile" | "register" | "sign-in"
  variant?: "header" | "subnav"
}

function renderLeafLink(
  item: ModuleLeafItem,
) {
  return (
    <NavigationMenuLink asChild key={item.href}>
      <Link href={item.href} className="group block rounded-lg p-2">
        <div className="flex items-start gap-2">
          <span className="mt-1 text-slate-400 transition group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-white">
            •
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 transition group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
              {item.label}
            </p>
          </div>
        </div>
      </Link>
    </NavigationMenuLink>
  )
}

export function ModuleNavMenu({ current, variant = "header" }: ModuleNavMenuProps) {
  const [visibleModules, setVisibleModules] = useState<ModuleNavigationItem[]>([])
  const [isLoadingVisibleModules, setIsLoadingVisibleModules] = useState(true)

  useEffect(() => {
    let active = true

    async function loadVisibleModules() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const accessToken = window.localStorage.getItem("access_token")
      const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
      const selectedOrganizationId = readSelectedOrganizationId()
      const isAdmin = storedUser?.role === "admin"

      if (!apiUrl || !accessToken || !storedUser?.id) {
        if (active) {
          setVisibleModules([])
          setIsLoadingVisibleModules(false)
        }
        return
      }

      if (isAdmin) {
        if (active) {
          setVisibleModules(MODULE_NAVIGATION)
          setIsLoadingVisibleModules(false)
        }
        return
      }

      if (!selectedOrganizationId) {
        if (active) {
          setVisibleModules([])
          setIsLoadingVisibleModules(false)
        }
        return
      }

      if (active) {
        setIsLoadingVisibleModules(true)
      }

      try {
        const permissions = await fetchMenuPermissions({
          apiUrl,
          accessToken,
          userId: storedUser.id,
          organizationId: selectedOrganizationId,
        })

        if (!active) {
          return
        }

        setVisibleModules(
          filterModuleNavigationByPermissions(MODULE_NAVIGATION, permissions, false),
        )
      } catch {
        if (active) {
          setVisibleModules([])
        }
      } finally {
        if (active) {
          setIsLoadingVisibleModules(false)
        }
      }
    }

    const handleOrganizationChange = () => {
      void loadVisibleModules()
    }

    void loadVisibleModules()
    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    window.addEventListener("storage", handleOrganizationChange)

    return () => {
      active = false
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
      window.removeEventListener("storage", handleOrganizationChange)
    }
  }, [])

  const hasVisibleModules = visibleModules.length > 0

  if (variant === "header") {
    return (
      <>
        {isLoadingVisibleModules ? null : hasVisibleModules ? (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Modules">
            {visibleModules.map((module) => {
              const isActive = current === module.key

              return (
                <Link
                  key={module.key}
                  href={module.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                  )}
                >
                  {module.label}
                </Link>
              )
            })}
          </nav>
        ) : null}

        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Open modules"
                title="Open modules"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-[min(88vw,420px)] border-r border-slate-200 bg-white/90 p-0 text-slate-900 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-100"
            >
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                  <SheetTitle className="text-base">Modules</SheetTitle>
                </SheetHeader>

                <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Organization
                  </p>
                  <OrganizationComboBox className="w-full text-xs" />
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {isLoadingVisibleModules ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                        Loading modules...
                      </p>
                    ) : hasVisibleModules ? (
                      <div className="space-y-2">
                        {visibleModules.map((module) => {
                          const isActive = current === module.key

                          return (
                            <Link
                              key={module.key}
                              href={module.href}
                              className={cn(
                                "block rounded-xl border px-3 py-3 text-sm font-medium transition",
                                isActive
                                  ? "border-slate-900 bg-slate-100 text-slate-950 dark:border-white dark:bg-white/10 dark:text-white"
                                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10",
                              )}
                            >
                              {module.label}
                            </Link>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                        No accessible modules.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </>
    )
  }

  return (
      <>
        <div className="hidden items-center lg:flex">
          {isLoadingVisibleModules ? null : hasVisibleModules ? (
            <NavigationMenu className="max-w-none">
              <NavigationMenuList className="gap-1">
                {visibleModules.map((module) => {
                  const isActive = current === module.key

                  return (
                    <NavigationMenuItem key={module.key}>
                      <NavigationMenuTrigger
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium",
                          isActive &&
                            "bg-slate-900 text-white hover:bg-slate-900 focus:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-white dark:focus:bg-white",
                        )}
                      >
                        {module.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="w-[min(900px,calc(100vw-1.5rem))]">
                        <ScrollArea className="h-[min(58vh,560px)]">
                          <div className="grid gap-4 p-4 md:grid-cols-[240px_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {module.label}
                              </p>
                              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {module.description}
                              </p>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={module.href}
                                  className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                                >
                                  Open overview
                                </Link>
                              </NavigationMenuLink>
                              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-400">
                                Use the submenu list on the right to jump directly into a section or nested item.
                              </div>
                            </div>

                            <div className="space-y-3">
                              {module.groups.map((group) => (
                                <section
                                  key={group.label}
                                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {group.label}
                                      </p>
                                      {group.description ? (
                                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                          {group.description}
                                        </p>
                                      ) : null}
                                    </div>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                                      {group.items.length} items
                                    </span>
                                  </div>

                                  <div className="mt-4 grid gap-3">
                                    {group.items.map((item) => (
                                      <div
                                        key={item.href || item.label}
                                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/5"
                                      >
                                        <NavigationMenuLink asChild>
                                          <Link
                                            href={item.href}
                                            className="block rounded-lg px-2 py-1 transition hover:bg-white dark:hover:bg-white/10"
                                          >
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                              {item.label}
                                            </p>
                                            {item.description ? (
                                              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                                {item.description}
                                              </p>
                                            ) : null}
                                          </Link>
                                        </NavigationMenuLink>

                                        {item.children?.length ? (
                                          <div className="mt-3 grid gap-1.5 border-l border-slate-200 pl-3 dark:border-white/10">
                                            {item.children.map((child) => renderLeafLink(child))}
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )
                })}
              </NavigationMenuList>
              <NavigationMenuViewport />
            </NavigationMenu>
          ) : null}
        </div>

        <div className="lg:hidden">
          <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Open modules"
              title="Open modules"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>

            <SheetContent side="left" className="w-[min(88vw,420px)] p-0">
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                  <SheetTitle className="text-base">Modules</SheetTitle>
                </SheetHeader>

                <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Organization
                </p>
                <OrganizationComboBox className="w-full text-xs" />
              </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {isLoadingVisibleModules ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                        Loading modules...
                      </p>
                    ) : hasVisibleModules ? (
                      <div className="space-y-2">
                        {visibleModules.map((module) => {
                          const isActive = current === module.key

                          return (
                            <Link
                              key={module.key}
                              href={module.href}
                              className={cn(
                                "block rounded-xl border px-3 py-3 text-sm font-medium transition",
                                isActive
                                  ? "border-slate-900 bg-slate-100 text-slate-950 dark:border-white dark:bg-white/10 dark:text-white"
                                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10",
                              )}
                            >
                              {module.label}
                            </Link>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                        No accessible modules.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
