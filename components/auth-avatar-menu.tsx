"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

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

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href="/account">Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-300"
          onSelect={(event) => {
            event.preventDefault()
            handleLogout()
          }}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
