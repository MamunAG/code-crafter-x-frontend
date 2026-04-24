import { NextRequest, NextResponse } from "next/server"

import { AUTH_COOKIE_NAME } from "@/lib/auth-session"

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const { pathname } = request.nextUrl

  if (pathname === "/login") {
    const signInUrl = new URL("/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }

  if (pathname === "/" || pathname === "/account" || pathname === "/profile") {
    if (!authCookie) {
      const signInUrl = new URL("/sign-in", request.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  if (pathname === "/sign-in" && authCookie) {
    const homeUrl = new URL("/", request.url)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/account", "/profile", "/login", "/sign-in"],
}
