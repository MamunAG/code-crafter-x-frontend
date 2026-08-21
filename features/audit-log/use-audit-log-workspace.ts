"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  readSelectedOrganizationId,
  requireSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"
import type { AuditRequestContext } from "./audit-log.service"

function isAuthFailure(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("session expired") ||
    normalized.includes("unauthorized")
  )
}

export function useAuditLogWorkspace(apiUrl: string) {
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState("")

  useEffect(() => {
    const initialSync = window.setTimeout(
      () => setOrganizationId(readSelectedOrganizationId()),
      0
    )
    function handleOrganizationChange(event: Event) {
      setOrganizationId(
        event instanceof CustomEvent
          ? event.detail?.organizationId || ""
          : readSelectedOrganizationId()
      )
    }
    window.addEventListener(
      SELECTED_ORGANIZATION_CHANGED_EVENT,
      handleOrganizationChange
    )
    return () => {
      window.clearTimeout(initialSync)
      window.removeEventListener(
        SELECTED_ORGANIZATION_CHANGED_EVENT,
        handleOrganizationChange
      )
    }
  }, [])

  const context = useCallback((): AuditRequestContext => {
    const accessToken = window.localStorage.getItem("access_token")
    if (!accessToken)
      throw new Error("Your session expired. Please sign in again.")
    return {
      apiUrl,
      accessToken,
      organizationId: requireSelectedOrganizationId(),
    }
  }, [apiUrl])

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      const message = error instanceof Error ? error.message : fallback
      if (isAuthFailure(message)) {
        window.localStorage.removeItem("access_token")
        window.localStorage.removeItem("refresh_token")
        window.localStorage.removeItem("auth_user")
        router.replace("/sign-in")
        return
      }
      toast.error(message)
    },
    [router]
  )

  return { organizationId, context, handleError }
}
