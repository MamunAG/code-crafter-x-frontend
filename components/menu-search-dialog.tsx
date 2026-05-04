"use client"

import * as React from "react"
import { ChevronRight, Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { fetchMenuPermissions } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { MENU_SEARCH_OPEN_EVENT } from "@/lib/app-hotkeys"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"
import {
  filterModuleNavigationByPermissions,
  MODULE_NAVIGATION,
  type ModuleNavItem,
  type ModuleNavigationItem,
} from "@/lib/module-navigation"
import { cn } from "@/lib/utils"

type SearchEntry = {
  href: string
  label: string
  searchValue: string
  moduleLabel: string
  groupLabel: string
  description?: string
}

function flattenModuleEntries(module: ModuleNavigationItem): SearchEntry[] {
  return module.groups.flatMap((group) =>
    group.items.flatMap((item) => {
      const baseSearchValue = [module.label, group.label, item.label, item.description, item.permissionMenuName]
        .filter(Boolean)
        .join(" ")

      const parentEntry: SearchEntry[] = item.href
        ? [
            {
              href: item.href,
              label: item.label,
              searchValue: baseSearchValue,
              moduleLabel: module.label,
              groupLabel: group.label,
              description: item.description,
            },
          ]
        : []

      const childEntries = item.children?.map((child) => ({
        href: child.href,
        label: child.label,
        searchValue: [module.label, group.label, item.label, child.label, child.description, child.permissionMenuName]
          .filter(Boolean)
          .join(" "),
        moduleLabel: module.label,
        groupLabel: group.label,
        description: child.description,
      })) ?? []

      return [...parentEntry, ...childEntries]
    }),
  )
}

export function MenuSearchDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [visibleModules, setVisibleModules] = React.useState<ModuleNavigationItem[]>([])
  const [isLoadingVisibleModules, setIsLoadingVisibleModules] = React.useState(true)

  React.useEffect(() => {
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
    window.addEventListener(MENU_SEARCH_OPEN_EVENT, handleOpenSearch)

    return () => {
      active = false
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
      window.removeEventListener("storage", handleOrganizationChange)
      window.removeEventListener(MENU_SEARCH_OPEN_EVENT, handleOpenSearch)
    }
  }, [])

  function handleOpenSearch() {
    setOpen(true)
  }

  const entries = React.useMemo(
    () => visibleModules.flatMap((module) => flattenModuleEntries(module)),
    [visibleModules],
  )

  const filteredEntries = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return entries
    }

    return entries.filter((entry) => entry.searchValue.toLowerCase().includes(normalizedQuery))
  }, [entries, query])

  const groupedEntries = React.useMemo(() => {
    return filteredEntries.reduce<Record<string, SearchEntry[]>>((accumulator, entry) => {
      accumulator[entry.moduleLabel] ??= []
      accumulator[entry.moduleLabel].push(entry)
      return accumulator
    }, {})
  }, [filteredEntries])

  const groupedModuleEntries = React.useMemo(
    () => Object.entries(groupedEntries),
    [groupedEntries],
  )

  const resultCount = filteredEntries.length

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Search menus"
        title="Search menus"
        className={cn(
          "size-9 rounded-full border border-slate-200 bg-white p-0 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
        )}
      >
        <Search className="size-3.5" aria-hidden="true" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setQuery("")
          }
        }}
        className="w-[min(94vw,52rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-slate-950"
        title="Search menus"
        description="Search menu names and navigate directly to a page."
      >
        <Command className="flex size-full flex-col overflow-hidden rounded-none border-0 bg-transparent p-0">
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Search menus
                </p>
                <p className="mt-1 max-w-[28rem] whitespace-nowrap text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Jump to any page or submenu.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">Shortcuts:</span>
                  <Badge
                    variant="outline"
                    className="h-4 border-slate-200 bg-white px-1.5 text-[9px] text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                  >
                    Ctrl+S
                  </Badge>
                  <span className="text-slate-400 dark:text-slate-500">or</span>
                  <Badge
                    variant="outline"
                    className="h-4 border-slate-200 bg-white px-1.5 text-[9px] text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                  >
                    Ctrl+Shift+F
                  </Badge>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Badge variant="outline" className="border-slate-200 bg-white text-[10px] text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
                  {resultCount} results
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-white text-[10px] text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
                  ESC
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
            <CommandInput
              placeholder={isLoadingVisibleModules ? "Loading menus..." : "Search by menu name, module, or page..."}
              value={query}
              onValueChange={setQuery}
              disabled={isLoadingVisibleModules}
              className="h-9 text-sm"
            />
          </div>

          <CommandList className="max-h-[30rem] p-2">
            <CommandEmpty className="rounded-2xl border border-dashed border-slate-200 py-10 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              {isLoadingVisibleModules ? "Loading menus..." : "No menu matched your search."}
            </CommandEmpty>

            {!isLoadingVisibleModules ? (
              groupedModuleEntries.map(([moduleLabel, moduleEntries]) => (
                <CommandGroup
                  key={moduleLabel}
                  heading={moduleLabel}
                  className="px-1 pb-2 pt-1 first:pt-0"
                >
                  {moduleEntries.map((entry) => (
                    <CommandItem
                      key={entry.href}
                      value={entry.searchValue}
                      onSelect={() => {
                        setOpen(false)
                        setQuery("")
                        router.push(entry.href)
                      }}
                      className="items-start gap-3 rounded-2xl px-3 py-3 data-selected:bg-slate-100 dark:data-selected:bg-white/10"
                    >
                      <span className="mt-1 flex size-2.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-950 dark:text-white">
                          {entry.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {entry.moduleLabel} / {entry.groupLabel}
                          {entry.description ? ` - ${entry.description}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <div className="px-2 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading menus...
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
