"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Sparkles,
  Plus,
  RefreshCcw,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"

import { EmbellishmentFormDialog } from "./component/embellishment-form-dialog"
import { EmbellishmentTableSection } from "./component/embellishment-table-section"
import { DeletedEmbellishmentsCard } from "./component/deleted-embellishments-card"
import {
  createEmbellishment,
  fetchEmbellishment,
  fetchEmbellishments,
  permanentlyDeleteEmbellishment,
  restoreEmbellishment,
  softDeleteEmbellishment,
  updateEmbellishment,
} from "./embellishment.service"
import type {
  EmbellishmentFilterValues,
  EmbellishmentFormValues,
  EmbellishmentRecord,
  PaginationMeta,
} from "./embellishment.types"

type EmbellishmentEditorMode = "create" | "edit"
type PendingDeleteMode = "soft" | "restore" | "permanent"
type EmbellishmentAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const EMBELLISHMENT_MENU_NAME = "Embellishment Setup"
const EMPTY_ACCESS_RULES: EmbellishmentAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: EmbellishmentFilterValues = {
  name: "",
  remarks: "",
}

const DEFAULT_FORM_VALUES: EmbellishmentFormValues = {
  name: "",
  remarks: "",
  isActive: true,
}

function getEmbellishmentLabel(embellishment: EmbellishmentRecord) {
  return embellishment.name
}

function normalizeAuthFailure(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized")
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
        <Sparkles className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
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

          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>

          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-[32rem] rounded-3xl" />
        </div>
      </ScrollArea>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  embellishment,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  embellishment: EmbellishmentRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete embellishment</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {embellishment ? getEmbellishmentLabel(embellishment) : "this embellishment"}
            </span>
            . You can restore it from the recently deleted card before removing it permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={working}
          >
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
  embellishment,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  embellishment: EmbellishmentRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title =
    action === "restore"
      ? "Restore embellishment"
      : "Delete embellishment permanently"
  const description =
    action === "restore"
      ? "Bring this embellishment back into the active merchandising list."
      : "This will permanently remove the embellishment record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {embellishment ? getEmbellishmentLabel(embellishment) : "this embellishment"}
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

export function EmbellishmentWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingEmbellishments, setLoadingEmbellishments] = useState(true)
  const [loadingDeletedEmbellishments, setLoadingDeletedEmbellishments] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<EmbellishmentAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [embellishments, setEmbellishments] = useState<EmbellishmentRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedEmbellishments, setDeletedEmbellishments] = useState<EmbellishmentRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<EmbellishmentFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<EmbellishmentFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<EmbellishmentFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<EmbellishmentFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EmbellishmentEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<EmbellishmentFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<EmbellishmentRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)

  const [recentlyDeletedEmbellishment, setRecentlyDeletedEmbellishment] = useState<EmbellishmentRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<EmbellishmentRecord | null>(null)
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
          menuName: EMBELLISHMENT_MENU_NAME,
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

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your embellishment menu access right now."

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

  const openEditDialog = useCallback(async (embellishmentId: number) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update embellishments.")
      return
    }

    setEditorMode("edit")
    setEditingId(embellishmentId)
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

      const record = await fetchEmbellishment({
        apiUrl,
        accessToken: token,
        id: embellishmentId,
        organizationId: selectedOrganizationId || undefined,
      })

      setEditorInitialValues({
        name: record.name ?? "",
        remarks: record.remarks ?? "",
        isActive: record.isActive !== "N",
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the embellishment record right now."

      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const openPendingActionDialog = useCallback(
    (embellishment: EmbellishmentRecord, mode: PendingDeleteMode) => {
      if (mode === "restore" && !accessRules?.canUpdate) {
        toast.error("You do not have permission to restore embellishments.")
        return
      }

      if (mode === "permanent" && !accessRules?.canDelete) {
        toast.error("You do not have permission to permanently delete embellishments.")
        return
      }

      setPendingActionTarget(embellishment)
      setPendingActionMode(mode)
    },
    [accessRules?.canDelete, accessRules?.canUpdate],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadEmbellishments() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setEmbellishments([])
        setMeta(null)
        setLoadingEmbellishments(false)
        return
      }

      setLoadingEmbellishments(true)
      setError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        const response = await fetchEmbellishments({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters: activeFilters,
          organizationId: selectedOrganizationId || undefined,
        })

        if (!active) {
          return
        }

        setEmbellishments(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load embellishments right now."

        if (normalizeAuthFailure(message)) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        setError(message)
      } finally {
        if (active) {
          setLoadingEmbellishments(false)
        }
      }
    }

    void loadEmbellishments()

    return () => {
      active = false
    }
  }, [
    accessRules?.canView,
    activeFilters,
    apiUrl,
    limit,
    loadingAccessRules,
    page,
    refreshVersion,
    router,
    selectedOrganizationId,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadDeletedEmbellishments() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView || !accessRules.canDelete) {
        setDeletedEmbellishments([])
        setDeletedMeta(null)
        setLoadingDeletedEmbellishments(false)
        return
      }

      setLoadingDeletedEmbellishments(true)
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        const response = await fetchEmbellishments({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        })

        if (!active) {
          return
        }

        setDeletedEmbellishments(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load deleted embellishments right now."

        if (normalizeAuthFailure(message)) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        setDeletedError(message)
      } finally {
        if (active) {
          setLoadingDeletedEmbellishments(false)
        }
      }
    }

    void loadDeletedEmbellishments()

    return () => {
      active = false
    }
  }, [
    accessRules?.canDelete,
    accessRules?.canView,
    apiUrl,
    deletedActiveFilters,
    deletedLimit,
    deletedPage,
    loadingAccessRules,
    refreshVersion,
    router,
    selectedOrganizationId,
  ])

  const activeCount = useMemo(
    () => embellishments.filter((embellishment) => embellishment.isActive !== "N" && !embellishment.deleted_at).length,
    [embellishments],
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
      toast.error("You do not have permission to create embellishments.")
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

  function requestSoftDelete(embellishment: EmbellishmentRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete embellishments.")
      return
    }

    setDeleteTarget(embellishment)
  }

  async function submitEditor(values: EmbellishmentFormValues) {
    if (editorSubmitting || editorLoading) {
      return
    }

    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create embellishments.")
      return
    }

    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update embellishments.")
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
        await createEmbellishment({
          apiUrl,
          accessToken: token,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("embellishment created successfully.")
      } else if (editingId != null) {
        await updateEmbellishment({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("embellishment updated successfully.")
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the embellishment right now."

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
      toast.error("You do not have permission to delete embellishments.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteEmbellishment({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })

      setRecentlyDeletedEmbellishment(deleteTarget)
      setDeleteTarget(null)
      toast.success("embellishment moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the embellishment right now."

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
        if (!accessRules?.canUpdate) {
          toast.error("You do not have permission to restore embellishments.")
          return
        }

        await restoreEmbellishment({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("embellishment restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete embellishments.")
          return
        }

        await permanentlyDeleteEmbellishment({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("embellishment deleted permanently.")
      }

      if (recentlyDeletedEmbellishment?.id === pendingActionTarget.id) {
        setRecentlyDeletedEmbellishment(null)
      }

      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to complete the delete action right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setPendingActionWorking(false)
    }
  }

  const deletedTotal = deletedMeta?.total ?? deletedEmbellishments.length
  const activeTotal = meta?.total ?? embellishments.length

  if (
    (loadingAccessRules || loadingEmbellishments) &&
    embellishments.length === 0 &&
    (loadingAccessRules || loadingDeletedEmbellishments) &&
    deletedEmbellishments.length === 0 &&
    !error &&
    !deletedError &&
    !accessError
  ) {
    return <WorkspaceSkeleton />
  }

  if (!loadingAccessRules && accessRules && !accessRules.canView) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Merchandising
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Embellishments
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising embellishment master data.
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
          title="embellishment access unavailable"
          description={accessError || "You do not have permission to view the embellishments menu for the selected organization."}
          actionLabel="Retry"
          onAction={triggerRefresh}
        />
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
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Merchandising
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Embellishments
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising embellishment master data.
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                  <RefreshCcw className="size-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <EmptyState
          title="Unable to load embellishments"
          description={error}
          actionLabel="Try again"
          onAction={triggerRefresh}
        />
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
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Merchandising master data
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Embellishments
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain merchandising embellishment records for the selected organization.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Total {activeTotal}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Deleted {deletedTotal}
                    </Badge>
                    {recentlyDeletedEmbellishment ? (
                      <Badge variant="destructive" className="rounded-full px-3 py-1">
                        Recently deleted
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                    <RefreshCcw className="size-3.5" />
                    Refresh
                  </Button>
                  {accessRules?.canCreate ? (
                    <Button type="button" onClick={openCreateDialog} className="rounded-xl">
                      <Plus className="size-3.5" />
                      New embellishment
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedEmbellishment ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted embellishment
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getEmbellishmentLabel(recentlyDeletedEmbellishment)} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() =>
                          openPendingActionDialog(recentlyDeletedEmbellishment, "restore")
                        }
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
                        onClick={() =>
                          openPendingActionDialog(recentlyDeletedEmbellishment, "permanent")
                        }
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
          <EmbellishmentTableSection
            embellishments={embellishments}
            meta={meta}
            page={page}
            limit={limit}
            loadingEmbellishments={loadingEmbellishments}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateEmbellishment={openCreateDialog}
            onEditEmbellishment={openEditDialog}
            onDeleteEmbellishment={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            canCreateEmbellishment={Boolean(accessRules?.canCreate)}
            canUpdateEmbellishment={Boolean(accessRules?.canUpdate)}
            canDeleteEmbellishment={Boolean(accessRules?.canDelete)}
          />

          {accessRules?.canDelete ? (
            <DeletedEmbellishmentsCard
              deletedEmbellishments={deletedEmbellishments}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedEmbellishments={loadingDeletedEmbellishments}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreEmbellishment={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteEmbellishment={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <EmbellishmentFormDialog
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
        embellishment={deleteTarget}
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
        embellishment={pendingActionTarget}
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


