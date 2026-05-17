"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import type { AppComboboxLoadParams, AppComboboxLoadResult, AppComboboxOption } from "@/components/app-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { fetchBuyers } from "@/features/merchandising/buyers/buyer.service"
import { fetchJobNumbersByBuyer } from "@/features/merchandising/jobs/job.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveTnaSection } from "./component/active-tna-section"
import { DeletedTnaSection } from "./component/deleted-tna-section"
import { TnaFormDialog } from "./component/tna-form-dialog"
import { TnaTaskFromDialog } from "./component/tna-task-from-dialog"
import { createTna, fetchTnaRecord, fetchTnaRecords, fetchTnaTasks, permanentlyDeleteTna, restoreTna, softDeleteTna, updateTna } from "./tna.service"
import type { PaginationMeta, TnaFilterValues, TnaFormValues, TnaRecord, TnaTaskRecord } from "./tna.types"

type TnaEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type TnaAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const MENU_NAME = "TNA"
const EMPTY_ACCESS_RULES: TnaAccessRules = { canView: false, canCreate: false, canUpdate: false, canDelete: false }

const DEFAULT_FILTERS: TnaFilterValues = { buyerId: "", jobId: "" }

const DEFAULT_FORM_VALUES: TnaFormValues = {
  buyerId: "",
  jobId: "",
  leadTime: "0",
  tnaDetails: [
    {
      id: crypto.randomUUID(),
      taskId: "",
      executionDate: "",
      days: "0",
      relationFormula: "",
    },
  ],
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function getBuyerLabel(record?: TnaRecord | null) {
  return record?.buyer?.displayName?.trim() || record?.buyer?.name?.trim() || "this TNA record"
}

function getJobLabel(record?: TnaRecord | null) {
  return record?.job?.jobNo?.trim() || "this TNA record"
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  record,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  record: TnaRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete TNA</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium text-slate-900 dark:text-slate-100">{record ? `${getBuyerLabel(record)} / ${getJobLabel(record)}` : "this TNA record"}</span>. You can restore it before removing it permanently.
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
  record,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  record: TnaRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action === "restore" ? "Restore TNA" : "Delete TNA permanently"}</AlertDialogTitle>
          <AlertDialogDescription>
            {action === "restore" ? "Bring this TNA record back into the active list." : "This will permanently remove the TNA record and cannot be undone."}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">{record ? `${getBuyerLabel(record)} / ${getJobLabel(record)}` : "this TNA record"}</span>.
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

export function TnaWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => (typeof window === "undefined" ? "" : readSelectedOrganizationId()))
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [accessRules, setAccessRules] = useState<TnaAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [records, setRecords] = useState<TnaRecord[]>([])
  const [deletedRecords, setDeletedRecords] = useState<TnaRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [loadingDeletedRecords, setLoadingDeletedRecords] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [draftFilters, setDraftFilters] = useState<TnaFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<TnaFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<TnaFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<TnaFilterValues>(DEFAULT_FILTERS)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<TnaEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorValues, setEditorValues] = useState<TnaFormValues>(DEFAULT_FORM_VALUES)
  const [initialBuyer, setInitialBuyer] = useState<{ value: string; label: string } | null>(null)
  const [initialJob, setInitialJob] = useState<{ value: string; label: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TnaRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedRecord, setRecentlyDeletedRecord] = useState<TnaRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<TnaRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)
  const [taskOptions, setTaskOptions] = useState<TnaTaskRecord[]>([])
  const [taskOptionsLoading, setTaskOptionsLoading] = useState(true)
  const [taskManagerOpen, setTaskManagerOpen] = useState(false)

  const handleAuthFailure = useCallback(
    (message: string) => {
      if (!normalizeAuthFailure(message)) return false
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
      router.replace("/sign-in")
      return true
    },
    [router],
  )

  const triggerRefresh = useCallback(() => setRefreshVersion((current) => current + 1), [])

  const loadTaskOptions = useCallback(async () => {
    setTaskOptionsLoading(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const response = await fetchTnaTasks({ apiUrl, accessToken: token, page: 1, limit: 100, organizationId: selectedOrganizationId || undefined })
      setTaskOptions(response.items)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load TNA tasks right now."
      if (!handleAuthFailure(message)) {
        setTaskOptions([])
      }
    } finally {
      setTaskOptionsLoading(false)
    }
  }, [apiUrl, handleAuthFailure, selectedOrganizationId])

  useEffect(() => {
    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  useEffect(() => {
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
          menuName: MENU_NAME,
        })

        if (active) setAccessRules(permission)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load TNA access right now."
        if (!handleAuthFailure(message) && active) {
          setAccessRules(EMPTY_ACCESS_RULES)
          setAccessError(message)
        }
      } finally {
        if (active) setLoadingAccessRules(false)
      }
    }

    void loadAccessRules()
    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    let active = true

    async function loadTasks() {
      setTaskOptionsLoading(true)
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchTnaTasks({ apiUrl, accessToken: token, page: 1, limit: 100, organizationId: selectedOrganizationId || undefined })
        if (active) {
          setTaskOptions(response.items)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load TNA tasks right now."
        if (!handleAuthFailure(message) && active) {
          setTaskOptions([])
        }
      } finally {
        if (active) setTaskOptionsLoading(false)
      }
    }

    void loadTasks()
    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    let active = true

    async function loadRecords() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setRecords([])
        setMeta(null)
        setLoadingRecords(false)
        return
      }

      setLoadingRecords(true)
      setError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchTnaRecords({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters: activeFilters,
          organizationId: selectedOrganizationId || undefined,
        })

        if (active) {
          setRecords(response.items)
          setMeta(response.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load TNA records right now."
        if (!handleAuthFailure(message) && active) setError(message)
      } finally {
        if (active) setLoadingRecords(false)
      }
    }

    void loadRecords()
    return () => {
      active = false
    }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    let active = true

    async function loadDeletedRecords() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setDeletedRecords([])
        setDeletedMeta(null)
        setLoadingDeletedRecords(false)
        return
      }

      setLoadingDeletedRecords(true)
      setDeletedError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchTnaRecords({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        })

        if (active) {
          setDeletedRecords(response.items)
          setDeletedMeta(response.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted TNA records right now."
        if (!handleAuthFailure(message) && active) setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedRecords(false)
      }
    }

    void loadDeletedRecords()
    return () => {
      active = false
    }
  }, [accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const loadBuyerOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchBuyers({
        apiUrl,
        accessToken: token,
        page: pageNumber,
        limit: pageLimit,
        filters: { name: query, isActive: "true" },
        organizationId: selectedOrganizationId || undefined,
      })
      return {
        items: response.items.map((buyer) => ({
          value: buyer.id,
          label: buyer.displayName?.trim() || buyer.name,
        })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadJobOptions = useCallback(
    async (
      { query }: AppComboboxLoadParams,
      buyerId?: string,
    ): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      if (!buyerId?.trim()) {
        return {
          items: [],
          hasNextPage: false,
        }
      }

      const jobs = await fetchJobNumbersByBuyer({
        apiUrl,
        accessToken: token,
        buyerId: buyerId.trim(),
        organizationId: selectedOrganizationId || undefined,
      })

      const normalizedQuery = query.trim().toLowerCase()
      const items = jobs
        .filter((job) => {
          if (!normalizedQuery) return true
          const jobLabel = job.jobNo?.trim() || ""
          return jobLabel.toLowerCase().includes(normalizedQuery)
        })
        .map((job) => ({
          value: job.id,
          label: job.jobNo?.trim() || job.id,
        }))

      return {
        items,
        hasNextPage: false,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadImportTnaOptions = useCallback(
    async ({
      buyerId,
      jobId,
      query,
      page: pageNumber,
      limit: pageLimit,
    }: AppComboboxLoadParams & { buyerId: string; jobId: string }) => {
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) throw new Error("Your session expired. Please sign in again.")

        const normalizedQuery = query.trim().toLowerCase()
        const response = await fetchTnaRecords({
          apiUrl,
          accessToken: token,
          page: normalizedQuery ? 1 : pageNumber,
          limit: normalizedQuery ? 100 : pageLimit,
          filters: { buyerId, jobId },
          organizationId: selectedOrganizationId || undefined,
        })

        const items = response.items
          .filter((record) => record.id !== editingId)
          .filter((record) => {
            if (!normalizedQuery) return true
            const createdAt = record.created_at ? String(record.created_at).slice(0, 10) : ""
            return `${record.id} ${createdAt} ${getBuyerLabel(record)} ${getJobLabel(record)}`.toLowerCase().includes(normalizedQuery)
          })
          .map((record) => {
            const createdAt = record.created_at ? String(record.created_at).slice(0, 10) : "saved TNA"
            const rowCount = record.tnaDetails?.length ?? 0

            return {
              value: record.id,
              label: `${createdAt} / ${rowCount} row${rowCount === 1 ? "" : "s"}`,
              record,
            }
          })

        return {
          items,
          hasNextPage: normalizedQuery ? false : response.meta.hasNextPage,
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load source TNA records right now."
        handleAuthFailure(message)
        throw caughtError
      }
    },
    [apiUrl, editingId, handleAuthFailure, selectedOrganizationId],
  )

  const loadImportTnaRecord = useCallback(
    async (id: string) => {
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) throw new Error("Your session expired. Please sign in again.")

        return await fetchTnaRecord({
          apiUrl,
          accessToken: token,
          id,
          organizationId: selectedOrganizationId || undefined,
        })
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load the source TNA record right now."
        handleAuthFailure(message)
        throw caughtError
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const openCreateDialog = useCallback(() => {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create TNA records.")
      return
    }

    setEditorMode("create")
    setEditorValues(DEFAULT_FORM_VALUES)
    setInitialBuyer(null)
    setInitialJob(null)
    setEditorError("")
    setEditorOpen(true)
  }, [accessRules?.canCreate])

  const openEditDialog = useCallback(async (id: string) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update TNA records.")
      return
    }

    setEditorMode("edit")
    setEditorLoading(true)
    setEditorError("")
    setEditorOpen(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const record = await fetchTnaRecord({
        apiUrl,
        accessToken: token,
        id,
        organizationId: selectedOrganizationId || undefined,
      })

      setEditingId(record.id)
      setEditorValues({
        buyerId: record.buyerId ?? "",
        jobId: record.jobId ?? "",
        leadTime: String(record.leadTime ?? 0),
        tnaDetails: (record.tnaDetails ?? []).map((detail) => ({
          id: detail.id || crypto.randomUUID(),
          taskId: detail.taskId ?? "",
          executionDate: detail.executionDate ? String(detail.executionDate).slice(0, 10) : "",
          days: String(detail.days ?? 0),
          sortOrder: detail.sortOrder ?? undefined,
          relationFormula: detail.relationFormula ?? "",
        })),
      })
      setInitialBuyer(record.buyerId ? { value: record.buyerId, label: getBuyerLabel(record) } : null)
      setInitialJob(record.jobId ? { value: record.jobId, label: record.job?.jobNo?.trim() || record.jobId } : null)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the TNA record right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const requestSoftDelete = useCallback((record: TnaRecord) => {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete TNA records.")
      return
    }

    setDeleteTarget(record)
  }, [accessRules?.canDelete])

  async function submitEditor(values: TnaFormValues) {
    if (editorSubmitting || editorLoading) return
    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create TNA records.")
      return
    }
    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update TNA records.")
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
        await createTna({
          apiUrl,
          accessToken: token,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("TNA created successfully.")
      } else if (editingId) {
        await updateTna({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("TNA updated successfully.")
      }

      setEditorOpen(false)
      setEditorValues(DEFAULT_FORM_VALUES)
      setInitialBuyer(null)
      setInitialJob(null)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the TNA right now."
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

    setDeleteWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteTna({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })
      setRecentlyDeletedRecord(deleteTarget)
      setDeleteTarget(null)
      toast.success("TNA moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the TNA right now."
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
          toast.error("You do not have permission to restore TNA records.")
          return
        }

        await restoreTna({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("TNA restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete TNA records.")
          return
        }

        await permanentlyDeleteTna({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("TNA deleted permanently.")
      }

      if (recentlyDeletedRecord?.id === pendingActionTarget.id) {
        setRecentlyDeletedRecord(null)
      }

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

  const deletedTotal = deletedMeta?.total ?? deletedRecords.length
  const activeTotal = meta?.total ?? records.length
  const activeCount = records.filter((record) => !record.deleted_at).length

  if ((loadingAccessRules || loadingRecords) && records.length === 0 && (loadingAccessRules || loadingDeletedRecords) && deletedRecords.length === 0 && !error && !deletedError && !accessError && !taskOptionsLoading) {
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">TNA</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage TNA records and task timelines.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
          <h3 className="text-lg font-semibold">TNA access unavailable</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{accessError || "You do not have permission to view the TNA menu for the selected organization."}</p>
          <Button type="button" onClick={triggerRefresh} className="mt-6 rounded-xl">Retry</Button>
        </div>
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">TNA</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage TNA records and task timelines.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
          <h3 className="text-lg font-semibold">Unable to load TNA</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <Button type="button" onClick={triggerRefresh} className="mt-6 rounded-xl">Try again</Button>
        </div>
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
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Merchandising production</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">TNA</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain TNA records with task timelines.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedRecord ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
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
                      New TNA
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedRecord ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted TNA</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">{getBuyerLabel(recentlyDeletedRecord)} / {getJobLabel(recentlyDeletedRecord)} was soft deleted and can still be restored.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() => {
                          setPendingActionTarget(recentlyDeletedRecord)
                          setPendingActionMode("restore")
                        }}
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
                        onClick={() => {
                          setPendingActionTarget(recentlyDeletedRecord)
                          setPendingActionMode("permanent")
                        }}
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

          {accessError && !accessRules?.canView ? (
            <Card>
              <CardContent className="p-6 text-sm text-destructive">{accessError}</CardContent>
            </Card>
          ) : null}

          <ActiveTnaSection
            records={records}
            meta={meta}
            page={page}
            limit={limit}
            loadingRecords={loadingRecords}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            loadBuyerOptions={loadBuyerOptions}
            loadJobOptions={loadJobOptions}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateTna={openCreateDialog}
            onEditTna={openEditDialog}
            onDeleteTna={requestSoftDelete}
            onResetFilters={() => {
              setDraftFilters(DEFAULT_FILTERS)
              setActiveFilters(DEFAULT_FILTERS)
              setPage(1)
            }}
            canCreateTna={Boolean(accessRules?.canCreate)}
            canUpdateTna={Boolean(accessRules?.canUpdate)}
            canDeleteTna={Boolean(accessRules?.canDelete)}
          />

          {accessRules?.canView ? (
            <DeletedTnaSection
              deletedRecords={deletedRecords}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedRecords={loadingDeletedRecords}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              loadBuyerOptions={loadBuyerOptions}
              loadJobOptions={loadJobOptions}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={(record, mode) => {
                setPendingActionTarget(record)
                setPendingActionMode(mode)
              }}
              canRestoreTna={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteTna={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <TnaFormDialog
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        initialBuyer={initialBuyer}
        initialJob={initialJob}
        initialValues={editorValues}
        taskOptions={taskOptions}
        taskOptionsLoading={taskOptionsLoading}
        currentTnaId={editingId}
        loadBuyerOptions={loadBuyerOptions}
        loadJobOptions={loadJobOptions}
        loadImportTnaOptions={loadImportTnaOptions}
        loadImportTnaRecord={loadImportTnaRecord}
        onNewTask={() => setTaskManagerOpen(true)}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditorValues(DEFAULT_FORM_VALUES)
            setInitialBuyer(null)
            setInitialJob(null)
            setEditorError("")
            setEditorLoading(false)
            setEditorSubmitting(false)
            setEditingId(null)
          }
        }}
        onSubmit={submitEditor}
      />

      <TnaTaskFromDialog
        open={taskManagerOpen}
        apiUrl={apiUrl}
        organizationId={selectedOrganizationId || undefined}
        onOpenChange={setTaskManagerOpen}
        onTasksChanged={loadTaskOptions}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        record={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        record={pendingActionTarget}
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
