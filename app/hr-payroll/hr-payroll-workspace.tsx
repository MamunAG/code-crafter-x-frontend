"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react"

import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { fetchMenuPermissions } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"
import { cn } from "@/lib/utils"
import {
  filterModuleSidebarGroupsByPermissions,
  getModuleNavigation,
  type ModuleGroup,
  type ModuleNavItem,
} from "@/lib/module-navigation"

function isPathActive(pathname: string, href: string) {
  if (!href) {
    return false
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getItemDepthClass(depth: number) {
  if (depth === 0) return "text-sm"
  if (depth === 1) return "text-xs"
  return "text-[11px]"
}

function getNavItemStateClass(isActive: boolean, isExactActive: boolean) {
  if (isExactActive) {
    return "bg-slate-200 text-slate-950 font-medium hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10"
  }

  if (isActive) {
    return "bg-slate-100 text-slate-900 hover:bg-slate-100 dark:bg-white/[0.07] dark:text-slate-100 dark:hover:bg-white/[0.07]"
  }

  return "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
}

function getActiveParentHrefs(items: ModuleNavItem[], pathname: string): string[] {
  return items.flatMap((item) => {
    if (!item.children?.length) {
      return []
    }

    const activeChildParents = getActiveParentHrefs(item.children, pathname)
    const hasActiveChild = item.children.some((child) => isPathActive(pathname, child.href))

    return hasActiveChild || activeChildParents.length
      ? [item.href, ...activeChildParents]
      : []
  })
}

function renderNavItem({
  item,
  pathname,
  openItems,
  setOpenItems,
  collapsed,
  depth,
  onNavigate,
}: {
  item: ModuleNavItem
  pathname: string
  openItems: string[]
  setOpenItems: Dispatch<SetStateAction<string[]>>
  collapsed: boolean
  depth: number
  onNavigate?: () => void
}) {
  const itemActive = isPathActive(pathname, item.href)
  const itemExactActive = pathname === item.href
  const isOpen = openItems.includes(item.href)
  const hasChildren = Boolean(item.children?.length)
  const shouldHighlightItem = hasChildren ? itemExactActive : itemActive

  return (
    <div key={item.href} className="space-y-1">
      {hasChildren ? (
        <button
          type="button"
          onClick={() =>
            setOpenItems((current) =>
              current.includes(item.href)
                ? current.filter((href) => href !== item.href)
                : [...current, item.href],
            )
          }
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition",
            getItemDepthClass(depth),
            getNavItemStateClass(shouldHighlightItem, itemExactActive),
          )}
        >
          <span className="truncate">{collapsed ? item.label.charAt(0) : item.label}</span>
          {collapsed ? null : (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "block rounded-lg px-3 py-2 transition",
            getItemDepthClass(depth),
            getNavItemStateClass(itemActive, itemExactActive),
          )}
        >
          <span>{collapsed ? item.label.charAt(0) : item.label}</span>
        </Link>
      )}

      {hasChildren && isOpen && !collapsed ? (
        <div className="mt-1 border-l border-slate-200 pl-3 dark:border-white/10">
          <div className="space-y-1 py-1">
            {item.children!.map((child) =>
              renderNavItem({
                item: child,
                pathname,
                openItems,
                setOpenItems,
                collapsed,
                depth: depth + 1,
                onNavigate,
              }),
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function HrPayrollWorkspace({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const app_module = getModuleNavigation("hr-payroll")
  const [openItems, setOpenItems] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpenPathname, setMobileOpenPathname] = useState<string | null>(null)
  const [visibleGroups, setVisibleGroups] = useState<ModuleGroup[]>([])

  useEffect(() => {
    let active = true

    async function loadVisibleGroups() {
      if (!app_module) {
        if (active) {
          setVisibleGroups([])
        }
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const accessToken = window.localStorage.getItem("access_token")
      const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
      const selectedOrganizationId = readSelectedOrganizationId()
      const isAdmin = storedUser?.role === "admin"

      if (isAdmin) {
        if (active) {
          setVisibleGroups(app_module.groups)
        }
        return
      }

      if (!apiUrl || !accessToken || !storedUser?.id || !selectedOrganizationId) {
        if (active) {
          setVisibleGroups([])
        }
        return
      }

      try {
        const permissions = await fetchMenuPermissions({
          apiUrl,
          accessToken,
          userId: storedUser.id,
          organizationId: selectedOrganizationId,
        })

        if (active) {
          setVisibleGroups(
            filterModuleSidebarGroupsByPermissions(app_module.groups, permissions, false),
          )
        }
      } catch {
        if (active) {
          setVisibleGroups([])
        }
      }
    }

    const handleOrganizationChange = () => {
      void loadVisibleGroups()
    }

    void loadVisibleGroups()
    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    window.addEventListener("storage", handleOrganizationChange)

    return () => {
      active = false
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
      window.removeEventListener("storage", handleOrganizationChange)
    }
  }, [app_module])

  const groups = useMemo(() => visibleGroups, [visibleGroups])
  const activeOpenItems = useMemo(
    () =>
      Array.from(
        new Set([
          ...openItems,
          ...groups.flatMap((group) => getActiveParentHrefs(group.items, pathname)),
        ]),
    ),
    [groups, openItems, pathname],
  )

  if (!app_module) {
    return null
  }

  const sidebarContent = (mobile = false) => {
    const isCompact = collapsed && !mobile

    return (
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-white/10">
        {!isCompact ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {app_module.label}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {app_module.description}
            </p>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
            M
          </div>
        )}

        {!mobile ? (
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Minimize sidebar"
            title="Minimize sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className={cn("px-2 py-3", collapsed && !mobile && "lg:px-1")}>
          {groups.map((group) => (
            <section key={group.label} className="mb-4">
              {!collapsed || mobile ? (
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) =>
                  renderNavItem({
                    item,
                    pathname,
                    openItems: activeOpenItems,
                    setOpenItems,
                    collapsed: isCompact,
                    depth: 0,
                    onNavigate: mobile ? () => setMobileOpenPathname(null) : undefined,
                  }),
                )}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full min-h-0 flex-1 flex-col px-3 pt-0 pb-4 sm:px-4 sm:py-6 lg:flex-row",
        collapsed ? "lg:gap-0" : "lg:gap-4",
      )}
    >
      <button
        type="button"
        onClick={() => setMobileOpenPathname(pathname)}
        className="fixed right-3 top-[51px] z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white lg:hidden"
        aria-label="Open HR payroll navigation"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="absolute left-3 top-4 z-20 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white lg:left-4 lg:top-4"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      <aside
        className={cn(
          "hidden h-full w-full min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 lg:flex lg:rounded-r-lg",
          collapsed ? "lg:w-0 lg:overflow-hidden lg:pointer-events-none lg:border-r-0" : "lg:w-64",
        )}
      >
        {sidebarContent(false)}
      </aside>

      <Sheet
        open={mobileOpenPathname === pathname}
        onOpenChange={(open) => setMobileOpenPathname(open ? pathname : null)}
      >
        <SheetContent
          side="left"
          className="w-[18rem] border-r border-slate-200 bg-white p-0 text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{app_module.label}</SheetTitle>
            <SheetDescription>{app_module.description}</SheetDescription>
          </SheetHeader>
          {sidebarContent(true)}
        </SheetContent>
      </Sheet>

      <section className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-200 bg-white/75 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
        {children}
      </section>
    </div>
  )
}
