"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveGmtCostScopesSection } from "./component/active-gmt-cost-scopes-section"
import { DeletedGmtCostScopesSection } from "./component/deleted-gmt-cost-scopes-section"
import { GmtCostScopeFormDialog } from "./component/gmt-cost-scope-form-dialog"
import {
  createGmtCostScope,
  fetchGmtCostScope,
  fetchGmtCostScopes,
  permanentlyDeleteGmtCostScope,
  restoreGmtCostScope,
  softDeleteGmtCostScope,
  updateGmtCostScope,
} from "./gmt-cost-scope.service"
import type { GmtCostScopeFilterValues, GmtCostScopeFormValues, GmtCostScopeRecord, PaginationMeta } from "./gmt-cost-scope.types"

type GmtCostScopeEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type GmtCostScopeAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const GMT_COST_SCOPE_MENU_NAME = "GMT Cost Scope Setup"
const EMPTY_ACCESS_RULES: GmtCostScopeAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: GmtCostScopeFilterValues = {
  name: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: GmtCostScopeFormValues = {
  name: "",
  isActive: true,
}

function getGmtCostScopeLabel(gmtCostScope: GmtCostScopeRecord) {
  return gmtCostScope.name
}

function normalizeAuthFailure(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("forbidden")
  )
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full max-w-72" />
                  <Skeleton className="h-4 w-full max-w-2xl" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
                  <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-[32rem] rounded-3xl" />
        </div>
      </ScrollArea>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  gmtCostScope,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  gmtCostScope: GmtCostScopeRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete GMT cost scope</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {gmtCostScope ? getGmtCostScopeLabel(gmtCostScope) : "this GMT cost scope"}
            </span>
            . You can restore it from the recently deleted card before removing it permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={working}>
            {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function RecentlyDeletedDialog({
  open,
  action,
  gmtCostScope,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  gmtCostScope: GmtCostScopeRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore GMT cost scope" : "Delete GMT cost scope permanently"
  const description =
    action === "restore"
      ? "Bring this GMT cost scope back into the active merchandising list."
      : "This will permanently remove the GMT cost scope record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {gmtCostScope ? getGmtCostScopeLabel(gmtCostScope) : "this GMT cost scope"}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={action === "restore" ? "default" : "destructive"} onClick={onConfirm} disabled={working}>
            {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {action === "restore" ? "Restore" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function GmtCostScopeWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingGmtCostScopes, setLoadingGmtCostScopes] = useState(true)
  const [loadingDeletedGmtCostScopes, setLoadingDeletedGmtCostScopes] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<GmtCostScopeAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [gmtCostScopes, setGmtCostScopes] = useState<GmtCostScopeRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedGmtCostScopes, setDeletedGmtCostScopes] = useState<GmtCostScopeRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<GmtCostScopeFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<GmtCostScopeFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<GmtCostScopeFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<GmtCostScopeFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<GmtCostScopeEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<GmtCostScopeFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<GmtCostScopeRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedGmtCostScope, setRecentlyDeletedGmtCostScope] = useState<GmtCostScopeRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<GmtCostScopeRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)
  const handleAuthFailure = useCallback((message: string) => {
    if (!normalizeAuthFailure(message)) return false

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
    }

    router.replace("/sign-in")
    return true
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") return

    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true

    async function loadAccessRules() {
      setLoadingAccessRules(true)
      setAccessError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
        if (storedUser?.role === "admin") {
          if (active) setAccessRules({ canView: true, canCreate: true, canUpdate: true, canDelete: true })
          return
        }

        const permission = await fetchCurrentMenuPermission({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          menuName: GMT_COST_SCOPE_MENU_NAME,
        })

        if (!active) return
        setAccessRules({
          canView: permission.canView,
          canCreate: permission.canCreate,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
        })
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load your GMT cost scope menu access right now."
        if (handleAuthFailure(message)) return
        setAccessRules(EMPTY_ACCESS_RULES)
        setAccessError(message)
      } finally {
        if (active) setLoadingAccessRules(false)
      }
    }

    void loadAccessRules()
    return () => { active = false }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  const openEditDialog = useCallback(async (gmtCostScopeId: number) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update GMT cost scopes.")
      return
    }

    setEditorMode("edit")
    setEditingId(gmtCostScopeId)
    setEditorError("")
    setEditorSubmitting(false)
    setEditorLoading(true)
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorOpen(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const record = await fetchGmtCostScope({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        id: gmtCostScopeId,
      })

      setEditorInitialValues({ name: record.name ?? "", isActive: record.isActive !== false })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the GMT cost scope record right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const openPendingActionDialog = useCallback((gmtCostScope: GmtCostScopeRecord, mode: PendingDeleteMode) => {
    if (mode === "restore" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to restore GMT cost scopes.")
      return
    }

    if (mode === "permanent" && !accessRules?.canDelete) {
      toast.error("You do not have permission to permanently delete GMT cost scopes.")
      return
    }

    setPendingActionTarget(gmtCostScope)
    setPendingActionMode(mode)
  }, [accessRules?.canDelete, accessRules?.canUpdate])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true

    async function loadGmtCostScopes() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setGmtCostScopes([])
        setMeta(null)
        setLoadingGmtCostScopes(false)
        return
      }

      setLoadingGmtCostScopes(true)
      setError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchGmtCostScopes({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page,
          limit,
          filters: activeFilters,
        })

        if (!active) return
        setGmtCostScopes(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load GMT cost scopes right now."
        if (handleAuthFailure(message)) return
        setError(message)
      } finally {
        if (active) setLoadingGmtCostScopes(false)
      }
    }

    void loadGmtCostScopes()
    return () => { active = false }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true

    async function loadDeletedGmtCostScopes() {
      if (loadingAccessRules) return
      if (!accessRules?.canView || !accessRules.canDelete) {
        setDeletedGmtCostScopes([])
        setDeletedMeta(null)
        setLoadingDeletedGmtCostScopes(false)
        return
      }

      setLoadingDeletedGmtCostScopes(true)
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchGmtCostScopes({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
        })

        if (!active) return
        setDeletedGmtCostScopes(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted GMT cost scopes right now."
        if (handleAuthFailure(message)) return
        setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedGmtCostScopes(false)
      }
    }

    void loadDeletedGmtCostScopes()
    return () => { active = false }
  }, [accessRules?.canDelete, accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])
  const activeCount = useMemo(() => gmtCostScopes.filter((gmtCostScope) => gmtCostScope.isActive !== false && !gmtCostScope.deleted_at).length, [gmtCostScopes])

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  function resetActiveFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setActiveFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function openCreateDialog() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create GMT cost scopes.")
      return
    }

    setEditorMode("create")
    setEditingId(null)
    setEditorError("")
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  function requestSoftDelete(gmtCostScope: GmtCostScopeRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete GMT cost scopes.")
      return
    }

    setDeleteTarget(gmtCostScope)
  }

  async function submitEditor(values: GmtCostScopeFormValues) {
    if (editorSubmitting || editorLoading) return

    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create GMT cost scopes.")
      return
    }

    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update GMT cost scopes.")
      return
    }

    setEditorSubmitting(true)
    setEditorError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (editorMode === "create") {
        await createGmtCostScope({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, payload: values })
      } else if (editingId !== null) {
        await updateGmtCostScope({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: editingId, payload: values })
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
      toast.success(editorMode === "create" ? "GMT cost scope saved successfully" : "GMT cost scope updated successfully")
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the GMT cost scope right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  async function confirmSoftDelete() {
    if (!deleteTarget || deleteWorking) return
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete GMT cost scopes.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteGmtCostScope({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: deleteTarget.id })
      setRecentlyDeletedGmtCostScope(deleteTarget)
      setDeleteTarget(null)
      triggerRefresh()
      toast.success("GMT cost scope deleted successfully")
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the GMT cost scope right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }

  async function confirmPendingAction() {
    if (!pendingActionTarget || !pendingActionMode || pendingActionWorking) return
    setPendingActionWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (pendingActionMode === "restore") {
        if (!accessRules?.canUpdate) {
          toast.error("You do not have permission to restore GMT cost scopes.")
          return
        }
        await restoreGmtCostScope({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: pendingActionTarget.id })
        toast.success("GMT cost scope restored successfully")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete GMT cost scopes.")
          return
        }
        await permanentlyDeleteGmtCostScope({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: pendingActionTarget.id })
        toast.success("GMT cost scope deleted permanently")
      }

      setRecentlyDeletedGmtCostScope(null)
      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to complete the delete action right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setPendingActionWorking(false)
    }
  }

  const deletedTotal = deletedMeta?.total ?? deletedGmtCostScopes.length
  const activeTotal = meta?.total ?? gmtCostScopes.length

  if ((loadingAccessRules || loadingGmtCostScopes) && gmtCostScopes.length === 0 && (loadingAccessRules || loadingDeletedGmtCostScopes) && deletedGmtCostScopes.length === 0 && !error && !deletedError && !accessError) {
    return <WorkspaceSkeleton />
  }

  if (!loadingAccessRules && accessRules && !accessRules.canView) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Merchandising</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">GMT Cost Scopes</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage merchandising GMT cost scope master data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">GMT cost scope access unavailable</p>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{accessError || "You do not have permission to view the GMT Cost Scope Setup menu for the selected organization."}</p>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="mt-4 rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Merchandising</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">GMT Cost Scopes</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage merchandising GMT cost scope master data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">Unable to load GMT cost scopes</p>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{error}</p>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="mt-4 rounded-xl"><RefreshCcw className="size-3.5" />Try again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-4 sm:p-8 sm:py-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Merchandising master data</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">GMT Cost Scopes</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain merchandising GMT cost scope records for the selected organization.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedGmtCostScope ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Refresh</Button>
                  {accessRules?.canCreate ? <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" />New GMT cost scope</Button> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedGmtCostScope ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted GMT cost scope</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">{getGmtCostScopeLabel(recentlyDeletedGmtCostScope)} was soft deleted and can still be restored.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? <Button type="button" variant="outline" className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50" onClick={() => openPendingActionDialog(recentlyDeletedGmtCostScope, "restore")}><Undo2 className="size-3.5" />Restore</Button> : null}
                    {accessRules?.canDelete ? <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedGmtCostScope, "permanent")}><Trash2 className="size-3.5" />Delete permanently</Button> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ActiveGmtCostScopesSection
            gmtCostScopes={gmtCostScopes}
            meta={meta}
            page={page}
            limit={limit}
            loadingGmtCostScopes={loadingGmtCostScopes}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateGmtCostScope={openCreateDialog}
            onEditGmtCostScope={openEditDialog}
            onDeleteGmtCostScope={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            canCreateGmtCostScope={Boolean(accessRules?.canCreate)}
            canUpdateGmtCostScope={Boolean(accessRules?.canUpdate)}
            canDeleteGmtCostScope={Boolean(accessRules?.canDelete)}
          />

          {accessRules?.canDelete ? (
            <DeletedGmtCostScopesSection
              deletedGmtCostScopes={deletedGmtCostScopes}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedGmtCostScopes={loadingDeletedGmtCostScopes}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreGmtCostScope={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteGmtCostScope={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <GmtCostScopeFormDialog
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        initialValues={editorInitialValues}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditorInitialValues(DEFAULT_FORM_VALUES)
            setEditorError("")
            setEditorLoading(false)
            setEditorSubmitting(false)
            setEditingId(null)
          }
        }}
        onSubmit={submitEditor}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        gmtCostScope={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        gmtCostScope={pendingActionTarget}
        working={pendingActionWorking}
        onOpenChange={(open) => {
          if (!open) {
            setPendingActionTarget(null)
            setPendingActionMode(null)
          }
        }}
        onConfirm={confirmPendingAction}
      />
    </div>
  )
}
