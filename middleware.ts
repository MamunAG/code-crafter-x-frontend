import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIE_NAME = "auth_session"

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const { pathname } = request.nextUrl

  if (pathname === "/login") {
    const signInUrl = new URL("/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }

  if (pathname === "/") {
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
  matcher: ["/", "/login", "/sign-in"],
}
