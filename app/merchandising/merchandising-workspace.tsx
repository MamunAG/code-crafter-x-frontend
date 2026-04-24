"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useState,
} from "react"

import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getModuleNavigation, type ModuleNavItem } from "@/lib/module-navigation"

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getItemDepthClass(depth: number) {
  if (depth === 0) return "text-sm"
  if (depth === 1) return "text-xs"
  return "text-[11px]"
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
}: {
  item: ModuleNavItem
  pathname: string
  openItems: string[]
  setOpenItems: Dispatch<SetStateAction<string[]>>
  collapsed: boolean
  depth: number
}) {
  const itemActive = isPathActive(pathname, item.href)
  const isOpen = openItems.includes(item.href)
  const hasChildren = Boolean(item.children?.length)

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
            itemActive
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
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
          className={cn(
            "block rounded-lg px-3 py-2 transition",
            getItemDepthClass(depth),
            itemActive
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
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
              }),
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MerchandisingOverview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_80px_rgba(0,0,0,0.28)] sm:p-10">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Merchandising
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Merchandising workspace
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
        This module now uses a simple left sidebar with grouped submenu links and nested child items.
      </p>

      <div className="mt-8">
        <Link
          href="/account"
          className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Go to account
        </Link>
      </div>
    </div>
  )
}

export function MerchandisingWorkspace({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const app_module = getModuleNavigation("merchandising")
  const [openItems, setOpenItems] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)

  const groups = useMemo(() => app_module?.groups ?? [], [app_module])
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

  return (
    <div
      className={cn(
        "relative flex h-full w-full min-h-0 flex-col px-3 py-4 sm:px-4 sm:py-6 lg:flex-row",
        collapsed ? "lg:gap-0" : "lg:gap-4",
      )}
    >
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
          "flex h-full w-full min-h-0 shrink-0 flex-col border-b border-slate-200 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 lg:border-b-0 lg:border-r",
          collapsed ? "lg:w-0 lg:overflow-hidden lg:pointer-events-none lg:border-r-0" : "lg:w-64",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-white/10">
            {!collapsed ? (
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

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Minimize sidebar"
              title="Minimize sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className={cn("px-2 py-3", collapsed && "lg:px-1")}>
              {groups.map((group) => (
                <section key={group.label} className="mb-4">
                  {!collapsed ? (
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
                        collapsed,
                        depth: 0,
                      }),
                    )}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <section className="min-w-0 flex-1 py-4 sm:py-6 lg:py-0">
        {children ?? <MerchandisingOverview />}
      </section>
    </div>
  )
}
