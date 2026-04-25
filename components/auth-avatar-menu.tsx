"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, UserRound, Settings2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  clearAuthSessionCookie,
  clearAuthUserAvatarCookie,
  clearAuthUserLabelCookie,
  getAuthInitials,
} from "@/lib/auth-session"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AuthAvatarMenuProps = {
  userLabel: string
  imageUrl?: string
}

export function AuthAvatarMenu({ userLabel, imageUrl }: AuthAvatarMenuProps) {
  const router = useRouter()

  function handleLogout() {
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("refresh_token")
    window.localStorage.removeItem("auth_user")
    document.cookie = clearAuthSessionCookie()
    document.cookie = clearAuthUserLabelCookie()
    document.cookie = clearAuthUserAvatarCookie()
    router.replace("/sign-in")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-white/20"
          aria-label={userLabel}
          title={userLabel}
        >
          <Avatar className="ring-2 ring-white shadow-sm dark:ring-white">
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt={userLabel} />
            ) : null}
            <AvatarFallback className="bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
              {getAuthInitials(userLabel)}
            </AvatarFallback>
          </Avatar>
        </button>
    </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]"
      >
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
          <Avatar className="size-8 ring-1 ring-white shadow-sm dark:ring-white/10">
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt={userLabel} />
            ) : null}
            <AvatarFallback className="bg-slate-900 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">
              {getAuthInitials(userLabel)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
              {userLabel}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Signed in
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-2 bg-slate-200/80 dark:bg-white/10" />
        <DropdownMenuItem
          asChild
          className="rounded-md transition-colors hover:bg-slate-900/40 hover:text-slate-100 dark:hover:bg-white/5 dark:hover:text-slate-100"
        >
          <Link href="/account" className="gap-2 text-xs text-slate-700 dark:text-slate-200">
            <Settings2 className="size-3.5 text-slate-400 dark:text-slate-500" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="rounded-md transition-colors hover:bg-slate-900/40 hover:text-slate-100 dark:hover:bg-white/5 dark:hover:text-slate-100"
        >
          <Link href="/profile" className="gap-2 text-xs text-slate-700 dark:text-slate-200">
            <UserRound className="size-3.5 text-slate-400 dark:text-slate-500" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-slate-200/80 dark:bg-white/10" />
        <DropdownMenuItem
          className="gap-2 rounded-md text-xs text-red-600 transition-colors hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          onSelect={(event) => {
            event.preventDefault()
            handleLogout()
          }}
        >
          <LogOut className="size-3.5" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
