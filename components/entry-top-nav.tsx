import Link from "next/link"
import { cookies } from "next/headers"
import { Bell } from "lucide-react"

import { AuthAvatarMenu } from "@/components/auth-avatar-menu"
import { ModuleNavMenu } from "@/components/module-nav-menu"
import {
  AUTH_COOKIE_NAME,
  AUTH_USER_AVATAR_COOKIE_NAME,
  AUTH_USER_LABEL_COOKIE_NAME,
  readAuthUserLabelCookie,
  readAuthUserAvatarCookie,
} from "@/lib/auth-session"
import { cn } from "@/lib/utils"

type EntryTopNavProps = {
  current:
    | "home"
    | "app-config"
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
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
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

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                current === "home"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
              )}
            >
              Home
            </Link>
            <ModuleNavMenu current={current} />
            <Link
              href="/account"
              aria-label="Notifications"
              title="Notifications"
              className={cn(
                "relative inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/20",
                current === "account"
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "",
              )}
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Link>
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
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
