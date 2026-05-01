"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { DeletedUnitsCard } from "./component/deleted-units-card"
import { UnitFormDialog } from "./component/unit-form-dialog"
import { UnitTableSection } from "./component/unit-table-section"
import {
  createUnit,
  downloadUnitUploadTemplate,
  fetchUnit,
  fetchUnits,
  permanentlyDeleteUnit,
  restoreUnit,
  softDeleteUnit,
  updateUnit,
  uploadUnitTemplate,
} from "./unit.service"
import type { PaginationMeta, UnitFilterValues, UnitFormValues, UnitRecord } from "./unit.types"

type UnitEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type UnitAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const UNIT_MENU_NAME = "Uom Setup"
const EMPTY_ACCESS_RULES: UnitAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: UnitFilterValues = {
  name: "",
  shortName: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: UnitFormValues = {
  name: "",
  shortName: "",
  isActive: "Y",
}

function getUnitLabel(unit: UnitRecord) {
  return unit.name
}

function normalizeAuthFailure(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("forbidden")
  )
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Plus className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
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
                  <Skeleton className="h-4 w-28 sm:w-32" />
                  <Skeleton className="h-10 w-full max-w-64 sm:max-w-72" />
                  <Skeleton className="h-4 w-full max-w-full sm:max-w-2xl" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
                  <Skeleton className="h-10 w-full rounded-xl sm:w-24" />
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
  unit,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  unit: UnitRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete unit</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {unit ? getUnitLabel(unit) : "this unit"}
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
  unit,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  unit: UnitRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore unit" : "Delete unit permanently"
  const description =
    action === "restore"
      ? "Bring this unit back into the active merchandising list."
      : "This will permanently remove the unit record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {unit ? getUnitLabel(unit) : "this unit"}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={action === "restore" ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={working}
          >
            {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {action === "restore" ? "Restore" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function UnitWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const [loadingUnits, setLoadingUnits] = useState(true)
  const [loadingDeletedUnits, setLoadingDeletedUnits] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<UnitAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [units, setUnits] = useState<UnitRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedUnits, setDeletedUnits] = useState<UnitRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<UnitFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<UnitFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<UnitFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<UnitFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<UnitEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<UnitFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<UnitRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedUnit, setRecentlyDeletedUnit] = useState<UnitRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<UnitRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const handleAuthFailure = useCallback((message: string) => {
    if (!normalizeAuthFailure(message)) {
      return false
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
    }

    router.replace("/sign-in")
    return true
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent
        ? event.detail?.organizationId
        : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => {
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

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
          if (active) {
            setAccessRules({
              canView: true,
              canCreate: true,
              canUpdate: true,
              canDelete: true,
            })
          }
          return
        }

        const permission = await fetchCurrentMenuPermission({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          menuName: UNIT_MENU_NAME,
        })

        if (!active) {
          return
        }

        setAccessRules({
          canView: permission.canView,
          canCreate: permission.canCreate,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
        })
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load your unit menu access right now."
        if (handleAuthFailure(message)) {
          return
        }

        setAccessRules(EMPTY_ACCESS_RULES)
        setAccessError(message)
      } finally {
        if (active) {
          setLoadingAccessRules(false)
        }
      }
    }

    void loadAccessRules()
    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  const openEditDialog = useCallback(async (unitId: number) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update units.")
      return
    }

    setEditorMode("edit")
    setEditingId(unitId)
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

      const record = await fetchUnit({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        id: unitId,
      })

      setEditorInitialValues({
        name: record.name ?? "",
        shortName: record.shortName ?? "",
        isActive: record.isActive === "N" || record.isActive === false ? "N" : "Y",
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the unit record right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const openPendingActionDialog = useCallback((unit: UnitRecord, mode: PendingDeleteMode) => {
    if (mode === "restore" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to restore units.")
      return
    }

    if (mode === "permanent" && !accessRules?.canDelete) {
      toast.error("You do not have permission to permanently delete units.")
      return
    }

    setPendingActionTarget(unit)
    setPendingActionMode(mode)
  }, [accessRules?.canDelete, accessRules?.canUpdate])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadUnits() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setUnits([])
        setMeta(null)
        setLoadingUnits(false)
        return
      }

      setLoadingUnits(true)
      setError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchUnits({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page,
          limit,
          filters: activeFilters,
        })

        if (!active) {
          return
        }

        setUnits(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load units right now."
        if (handleAuthFailure(message)) {
          return
        }

        setError(message)
        toast.error(message)
      } finally {
        if (active) {
          setLoadingUnits(false)
        }
      }
    }

    void loadUnits()
    return () => {
      active = false
    }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadDeletedUnits() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView || !accessRules?.canDelete) {
        setDeletedUnits([])
        setDeletedMeta(null)
        setLoadingDeletedUnits(false)
        return
      }

      setLoadingDeletedUnits(true)
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchUnits({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
        })

        if (!active) {
          return
        }

        setDeletedUnits(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted units right now."
        if (handleAuthFailure(message)) {
          return
        }

        setDeletedError(message)
      } finally {
        if (active) {
          setLoadingDeletedUnits(false)
        }
      }
    }

    void loadDeletedUnits()
    return () => {
      active = false
    }
  }, [accessRules?.canDelete, accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const activeCount = useMemo(
    () => units.filter((unit) => unit.isActive !== "N" && unit.isActive !== false && !unit.deleted_at).length,
    [units],
  )

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
      toast.error("You do not have permission to create units.")
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

  async function downloadTemplate() {
    if (!accessRules?.canCreate || downloadingTemplate) {
      if (!accessRules?.canCreate) {
        toast.error("You do not have permission to download the unit template.")
      }
      return
    }

    setDownloadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const blob = await downloadUnitUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "unit-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to download the unit template right now."
      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file || uploadingTemplate) {
      return
    }

    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to upload units.")
      return
    }

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadUnitTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })
      toast.success(`Unit upload completed. ${result.inserted} inserted, ${result.skipped} already existed.`)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to upload the unit template right now."
      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setUploadingTemplate(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
  }

  function requestSoftDelete(unit: UnitRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete units.")
      return
    }

    setDeleteTarget(unit)
  }

  async function submitEditor(values: UnitFormValues) {
    if (editorSubmitting || editorLoading) {
      return
    }

    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create units.")
      return
    }

    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update units.")
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
        await createUnit({
          apiUrl,
          accessToken: token,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Unit created successfully.")
      } else if (editingId !== null) {
        await updateUnit({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Unit updated successfully.")
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the unit right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  async function confirmSoftDelete() {
    if (!deleteTarget || deleteWorking) {
      return
    }

    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete units.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteUnit({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })
      setRecentlyDeletedUnit(deleteTarget)
      setDeleteTarget(null)
      toast.success("Unit moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the unit right now."
      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setDeleteWorking(false)
    }
  }

  async function confirmPendingAction() {
    if (!pendingActionTarget || !pendingActionMode || pendingActionWorking) {
      return
    }

    setPendingActionWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (pendingActionMode === "restore") {
        await restoreUnit({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Unit restored successfully.")
      } else {
        await permanentlyDeleteUnit({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Unit deleted permanently.")
      }

      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to complete this action right now."
      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setPendingActionWorking(false)
    }
  }

  if (loadingAccessRules) {
    return <WorkspaceSkeleton />
  }

  if (!accessRules?.canView) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <EmptyState
              title="Unit access unavailable"
              description={accessError || "You do not have permission to view the Unit Setup menu for the selected organization."}
              actionLabel="Retry"
              onAction={triggerRefresh}
            />
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      App Config
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                      Units
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Create, update, soft delete, restore, and bulk import merchandising units for the selected organization.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                    <RefreshCcw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>

            <EmptyState
              title="Unable to load units"
              description={error}
              actionLabel="Try again"
              onAction={triggerRefresh}
            />
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    App configuration reference data
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Units
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, update, soft delete, restore, and bulk import merchandising units for the selected organization.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerRefresh}
                    className="rounded-xl"
                    disabled={loadingUnits || loadingDeletedUnits}
                  >
                    {loadingUnits || loadingDeletedUnits ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    onClick={openCreateDialog}
                    className="rounded-xl"
                    disabled={Boolean(!accessRules?.canCreate)}
                  >
                    <Plus className="size-3.5" />
                    New unit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Active units</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{activeCount}</p>
              </CardContent>
            </Card>
            <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total units</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{meta?.total ?? units.length}</p>
              </CardContent>
            </Card>
            <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Deleted units</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{deletedMeta?.total ?? deletedUnits.length}</p>
              </CardContent>
            </Card>
          </div>

          {recentlyDeletedUnit ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted unit</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getUnitLabel(recentlyDeletedUnit)} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() => openPendingActionDialog(recentlyDeletedUnit, "restore")}
                      >
                        <Undo2 className="size-3.5" />
                        Restore
                      </Button>
                    ) : null}
                    {accessRules?.canDelete ? (
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => openPendingActionDialog(recentlyDeletedUnit, "permanent")}
                      >
                        <Trash2 className="size-3.5" />
                        Delete permanently
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <UnitTableSection
            units={units}
            meta={meta}
            page={page}
            limit={limit}
            loadingUnits={loadingUnits}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateUnit={openCreateDialog}
            onEditUnit={openEditDialog}
            onDeleteUnit={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            canCreateUnit={Boolean(accessRules?.canCreate)}
            canUpdateUnit={Boolean(accessRules?.canUpdate)}
            canDeleteUnit={Boolean(accessRules?.canDelete)}
            downloadingTemplate={downloadingTemplate}
            uploadingTemplate={uploadingTemplate}
          />

          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => void uploadTemplate(event.target.files?.[0])}
          />

          {accessRules?.canDelete ? (
            <DeletedUnitsCard
              deletedUnits={deletedUnits}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedUnits={loadingDeletedUnits}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreUnit={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteUnit={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <UnitFormDialog
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
        unit={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        unit={pendingActionTarget}
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
