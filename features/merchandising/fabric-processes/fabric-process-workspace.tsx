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

import { ActiveFabricProcessesSection } from "./component/active-fabric-processes-section"
import { DeletedFabricProcessesSection } from "./component/deleted-fabric-processes-section"
import { FabricProcessFormDialog } from "./component/fabric-process-form-dialog"
import {
  createFabricProcess,
  fetchFabricProcess,
  fetchFabricProcesses,
  permanentlyDeleteFabricProcess,
  restoreFabricProcess,
  softDeleteFabricProcess,
  updateFabricProcess,
} from "./fabric-process.service"
import type { FabricProcessFilterValues, FabricProcessFormValues, FabricProcessRecord, PaginationMeta } from "./fabric-process.types"

type FabricProcessEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type FabricProcessAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const FABRIC_PROCESS_MENU_NAME = "Fabric Process Setup"
const EMPTY_ACCESS_RULES: FabricProcessAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: FabricProcessFilterValues = {
  name: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: FabricProcessFormValues = {
  name: "",
  stage: "GREY_TO_FINISHED",
  sortOrder: "0",
  isActive: true,
}

function getFabricProcessLabel(fabricProcess: FabricProcessRecord) {
  return fabricProcess.name
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
  fabricProcess,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  fabricProcess: FabricProcessRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete fabric process</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {fabricProcess ? getFabricProcessLabel(fabricProcess) : "this fabric process"}
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
  fabricProcess,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  fabricProcess: FabricProcessRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore fabric process" : "Delete fabric process permanently"
  const description =
    action === "restore"
      ? "Bring this fabric process back into the active merchandising list."
      : "This will permanently remove the fabric process record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {fabricProcess ? getFabricProcessLabel(fabricProcess) : "this fabric process"}
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

export function FabricProcessWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingFabricProcesses, setLoadingFabricProcesses] = useState(true)
  const [loadingDeletedFabricProcesses, setLoadingDeletedFabricProcesses] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<FabricProcessAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [fabricProcesses, setFabricProcesses] = useState<FabricProcessRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedFabricProcesses, setDeletedFabricProcesses] = useState<FabricProcessRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<FabricProcessFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<FabricProcessFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<FabricProcessFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<FabricProcessFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<FabricProcessEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<FabricProcessFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<FabricProcessRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedFabricProcess, setRecentlyDeletedFabricProcess] = useState<FabricProcessRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<FabricProcessRecord | null>(null)
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
          menuName: FABRIC_PROCESS_MENU_NAME,
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
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load your fabric process menu access right now."
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

  const openEditDialog = useCallback(async (fabricProcessId: number) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update fabric processes.")
      return
    }

    setEditorMode("edit")
    setEditingId(fabricProcessId)
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

      const record = await fetchFabricProcess({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        id: fabricProcessId,
      })

      setEditorInitialValues({
        name: record.name ?? "",
        stage: record.stage ?? "GREY_TO_FINISHED",
        sortOrder: String(record.sortOrder ?? 0),
        isActive: record.isActive !== false,
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the fabric process record right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const openPendingActionDialog = useCallback((fabricProcess: FabricProcessRecord, mode: PendingDeleteMode) => {
    if (mode === "restore" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to restore fabric processes.")
      return
    }

    if (mode === "permanent" && !accessRules?.canDelete) {
      toast.error("You do not have permission to permanently delete fabric processes.")
      return
    }

    setPendingActionTarget(fabricProcess)
    setPendingActionMode(mode)
  }, [accessRules?.canDelete, accessRules?.canUpdate])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true

    async function loadFabricProcesses() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setFabricProcesses([])
        setMeta(null)
        setLoadingFabricProcesses(false)
        return
      }

      setLoadingFabricProcesses(true)
      setError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchFabricProcesses({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page,
          limit,
          filters: activeFilters,
        })

        if (!active) return
        setFabricProcesses(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load fabric processes right now."
        if (handleAuthFailure(message)) return
        setError(message)
      } finally {
        if (active) setLoadingFabricProcesses(false)
      }
    }

    void loadFabricProcesses()
    return () => { active = false }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true

    async function loadDeletedFabricProcesses() {
      if (loadingAccessRules) return
      if (!accessRules?.canView || !accessRules.canDelete) {
        setDeletedFabricProcesses([])
        setDeletedMeta(null)
        setLoadingDeletedFabricProcesses(false)
        return
      }

      setLoadingDeletedFabricProcesses(true)
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchFabricProcesses({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
        })

        if (!active) return
        setDeletedFabricProcesses(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted fabric processes right now."
        if (handleAuthFailure(message)) return
        setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedFabricProcesses(false)
      }
    }

    void loadDeletedFabricProcesses()
    return () => { active = false }
  }, [accessRules?.canDelete, accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])
  const activeCount = useMemo(() => fabricProcesses.filter((fabricProcess) => fabricProcess.isActive !== false && !fabricProcess.deleted_at).length, [fabricProcesses])

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
      toast.error("You do not have permission to create fabric processes.")
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

  function requestSoftDelete(fabricProcess: FabricProcessRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete fabric processes.")
      return
    }

    setDeleteTarget(fabricProcess)
  }

  async function submitEditor(values: FabricProcessFormValues) {
    if (editorSubmitting || editorLoading) return

    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create fabric processes.")
      return
    }

    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update fabric processes.")
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
        await createFabricProcess({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, payload: values })
      } else if (editingId !== null) {
        await updateFabricProcess({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: editingId, payload: values })
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
      toast.success(editorMode === "create" ? "Fabric process saved successfully" : "Fabric process updated successfully")
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the fabric process right now."
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
      toast.error("You do not have permission to delete fabric processes.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteFabricProcess({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: deleteTarget.id })
      setRecentlyDeletedFabricProcess(deleteTarget)
      setDeleteTarget(null)
      triggerRefresh()
      toast.success("Fabric process deleted successfully")
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the fabric process right now."
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
          toast.error("You do not have permission to restore fabric processes.")
          return
        }
        await restoreFabricProcess({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: pendingActionTarget.id })
        toast.success("Fabric process restored successfully")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete fabric processes.")
          return
        }
        await permanentlyDeleteFabricProcess({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, id: pendingActionTarget.id })
        toast.success("Fabric process deleted permanently")
      }

      setRecentlyDeletedFabricProcess(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedFabricProcesses.length
  const activeTotal = meta?.total ?? fabricProcesses.length

  if ((loadingAccessRules || loadingFabricProcesses) && fabricProcesses.length === 0 && (loadingAccessRules || loadingDeletedFabricProcesses) && deletedFabricProcesses.length === 0 && !error && !deletedError && !accessError) {
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fabric Processes</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage merchandising fabric process master data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">Fabric process access unavailable</p>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{accessError || "You do not have permission to view the Fabric Process Setup menu for the selected organization."}</p>
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fabric Processes</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage merchandising fabric process master data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">Unable to load fabric processes</p>
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
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Fabric Processes</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain merchandising fabric process records for the selected organization.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedFabricProcess ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Refresh</Button>
                  {accessRules?.canCreate ? <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" />New fabric process</Button> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedFabricProcess ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted fabric process</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">{getFabricProcessLabel(recentlyDeletedFabricProcess)} was soft deleted and can still be restored.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? <Button type="button" variant="outline" className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50" onClick={() => openPendingActionDialog(recentlyDeletedFabricProcess, "restore")}><Undo2 className="size-3.5" />Restore</Button> : null}
                    {accessRules?.canDelete ? <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedFabricProcess, "permanent")}><Trash2 className="size-3.5" />Delete permanently</Button> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ActiveFabricProcessesSection
            fabricProcesses={fabricProcesses}
            meta={meta}
            page={page}
            limit={limit}
            loadingFabricProcesses={loadingFabricProcesses}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateFabricProcess={openCreateDialog}
            onEditFabricProcess={openEditDialog}
            onDeleteFabricProcess={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            canCreateFabricProcess={Boolean(accessRules?.canCreate)}
            canUpdateFabricProcess={Boolean(accessRules?.canUpdate)}
            canDeleteFabricProcess={Boolean(accessRules?.canDelete)}
          />

          {accessRules?.canDelete ? (
            <DeletedFabricProcessesSection
              deletedFabricProcesses={deletedFabricProcesses}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedFabricProcesses={loadingDeletedFabricProcesses}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreFabricProcess={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteFabricProcess={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <FabricProcessFormDialog
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
        fabricProcess={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        fabricProcess={pendingActionTarget}
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
