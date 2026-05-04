import Link from "next/link"
import { cookies } from "next/headers"
import { House } from "lucide-react"

import { AuthAvatarMenu } from "@/components/auth-avatar-menu"
import { ModuleNavMenu } from "@/components/module-nav-menu"
import { NotificationBell } from "@/components/notification-bell"
import {
  AUTH_COOKIE_NAME,
  AUTH_USER_AVATAR_COOKIE_NAME,
  AUTH_USER_LABEL_COOKIE_NAME,
  readAuthUserLabelCookie,
  readAuthUserAvatarCookie,
} from "@/lib/auth-session"
import { cn } from "@/lib/utils"
import { OrganizationComboBox } from "./organization-combobox"

type EntryTopNavProps = {
  current:
  | "home"
  | "app-config"
  | "hr-payroll"
  | "merchandising"
  | "iam"
  | "account"
  | "profile"
  | "register"
  | "sign-in"
}

const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home" as const },
  { href: "/register", label: "Register", key: "register" as const },
  { href: "/sign-in", label: "Sign in", key: "sign-in" as const },
]

export async function EntryTopNav({ current }: EntryTopNavProps) {
  const cookieStore = await cookies()
  const isAuthenticated = Boolean(cookieStore.get(AUTH_COOKIE_NAME)?.value)
  const userLabel = readAuthUserLabelCookie(
    cookieStore.get(AUTH_USER_LABEL_COOKIE_NAME)?.value,
  )
  const userImageUrl = readAuthUserAvatarCookie(
    cookieStore.get(AUTH_USER_AVATAR_COOKIE_NAME)?.value,
  )

  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-white/70 bg-white/85 px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.10)] backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_12px_32px_rgba(0,0,0,0.24)] sm:px-4">
      <div className="mx-auto flex w-full max-w-8xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
              CX
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Code Crafter X
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Workspace
              </p>
            </div>
          </Link>
          <div className="lg:hidden">
            <ModuleNavMenu current={current} />
          </div>
          <div className="hidden lg:block">
            <OrganizationComboBox />
          </div>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Home"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/20 sm:h-auto sm:w-auto sm:rounded-full sm:border-0 sm:bg-transparent sm:px-2.5 sm:py-1.5 sm:text-xs sm:font-medium sm:text-slate-600 sm:hover:bg-slate-100 sm:hover:text-slate-900 sm:focus-visible:ring-0 dark:sm:text-slate-300 dark:sm:hover:bg-white/5 dark:sm:hover:text-white",
                current === "home"
                  ? "border-slate-900 bg-slate-900 text-white hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-white dark:bg-white dark:text-slate-900 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900 sm:border-0 sm:bg-slate-900 sm:text-white sm:hover:bg-slate-900 sm:hover:text-white dark:sm:bg-white dark:sm:text-slate-900 dark:sm:hover:bg-white dark:sm:hover:text-slate-900"
                  : "",
              )}
            >
              <House className="h-3.5 w-3.5 sm:hidden" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="hidden lg:block">
              <ModuleNavMenu current={current} />
            </div>
            <NotificationBell />
            <AuthAvatarMenu userLabel={userLabel} imageUrl={userImageUrl} />
          </div>
        ) : (
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === current

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:px-3",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                  )}
                >
                  {item.key === "home" ? (
                    <>
                      <House className="h-3.5 w-3.5 sm:hidden" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
