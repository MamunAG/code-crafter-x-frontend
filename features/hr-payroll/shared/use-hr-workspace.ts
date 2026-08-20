"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  readSelectedOrganizationId,
  requireSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"
import type { HrRequestContext } from "./hr-api"

function isAuthFailure(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes("session expired") || normalized.includes("unauthorized")
}

export function useHrWorkspace(apiUrl: string) {
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const initialSync = window.setTimeout(() => setOrganizationId(readSelectedOrganizationId()), 0)
    function handleOrganizationChange(event: Event) {
      setOrganizationId(event instanceof CustomEvent ? event.detail?.organizationId || "" : readSelectedOrganizationId())
    }
    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => {
      window.clearTimeout(initialSync)
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    }
  }, [])

  const context = useCallback((): HrRequestContext => {
    const accessToken = window.localStorage.getItem("access_token")
    if (!accessToken) throw new Error("Your session expired. Please sign in again.")
    const selectedOrganizationId = requireSelectedOrganizationId()
    return { apiUrl, accessToken, organizationId: selectedOrganizationId }
  }, [apiUrl])

  const handleError = useCallback((error: unknown, fallback: string, showToast = true) => {
    const message = error instanceof Error ? error.message : fallback
    if (isAuthFailure(message)) {
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
      router.replace("/sign-in")
      return message
    }
    if (showToast) toast.error(message)
    return message
  }, [router])

  const triggerRefresh = useCallback(() => setRefreshVersion((current) => current + 1), [])
  return { organizationId, context, handleError, refreshVersion, triggerRefresh }
}

