"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveDepartmentSection } from "./component/active-department-section"
import { DeletedDepartmentSection } from "./component/deleted-department-section"
import { DepartmentFormDialog } from "./component/department-form-dialog"
import {
  createDepartment,
  downloadDepartmentUploadTemplate,
  fetchDepartment,
  fetchDepartments,
  permanentlyDeleteDepartment,
  restoreDepartment,
  softDeleteDepartment,
  uploadDepartmentTemplate,
  updateDepartment,
} from "./department.service"
import type { DepartmentFilterValues, DepartmentFormValues, DepartmentRecord, PaginationMeta } from "./department.types"

type DepartmentEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"

const DEFAULT_FILTERS: DepartmentFilterValues = {
  departmentName: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: DepartmentFormValues = {
  departmentName: "",
  description: "",
  isActive: true,
}

function getDepartmentLabel(department: DepartmentRecord) {
  return department.departmentName
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
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

function DeleteConfirmDialog({
  open,
  department,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  department: DepartmentRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete department</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium text-slate-900 dark:text-slate-100">{department ? getDepartmentLabel(department) : "this department"}</span>.
            You can restore it from the recently deleted card before removing it permanently.
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
  department,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  department: DepartmentRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore department" : "Delete department permanently"
  const description =
    action === "restore"
      ? "Bring this department back into the active configuration list."
      : "This will permanently remove the department record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} <span className="font-medium text-slate-900 dark:text-slate-100">{department ? getDepartmentLabel(department) : "this department"}</span>.
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

export function DepartmentWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [loadingDeletedDepartments, setLoadingDeletedDepartments] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => (typeof window === "undefined" ? "" : readSelectedOrganizationId()))

  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [deletedDepartments, setDeletedDepartments] = useState<DepartmentRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [activeFilters, setActiveFilters] = useState<DepartmentFilterValues>(DEFAULT_FILTERS)
  const [deletedFilters, setDeletedFilters] = useState<DepartmentFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<DepartmentEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<DepartmentFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<DepartmentRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedDepartment, setRecentlyDeletedDepartment] = useState<DepartmentRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<DepartmentRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const handleAuthFailure = useCallback(
    (message: string) => {
      if (!normalizeAuthFailure(message)) return false

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("access_token")
        window.localStorage.removeItem("refresh_token")
        window.localStorage.removeItem("auth_user")
      }

      router.replace("/sign-in")
      return true
    },
    [router],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  const triggerRefresh = useCallback(() => setRefreshVersion((current) => current + 1), [])

  const loadDepartments = useCallback(async () => {
    setLoadingDepartments(true)
    setLoadingDeletedDepartments(true)
    setError("")
    setDeletedError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const [activeResponse, deletedResponse] = await Promise.all([
        fetchDepartments({ apiUrl, accessToken: token, page, limit, filters: activeFilters, organizationId: selectedOrganizationId || undefined }),
        fetchDepartments({ apiUrl, accessToken: token, page: deletedPage, limit: deletedLimit, filters: deletedFilters, deletedOnly: true, organizationId: selectedOrganizationId || undefined }),
      ])

      setDepartments(activeResponse.items)
      setMeta(activeResponse.meta)
      setDeletedDepartments(deletedResponse.items)
      setDeletedMeta(deletedResponse.meta)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load department data right now."
      if (!handleAuthFailure(message)) {
        setError(message)
        setDeletedError(message)
        toast.error(message)
      }
    } finally {
      setLoadingDepartments(false)
      setLoadingDeletedDepartments(false)
    }
  }, [activeFilters, apiUrl, deletedFilters, deletedLimit, deletedPage, handleAuthFailure, limit, page, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") return
    void loadDepartments()
  }, [loadDepartments, refreshVersion])

  function openCreateDialog() {
    setEditorMode("create")
    setEditorError("")
    setEditingId(null)
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorOpen(true)
  }

  const openEditDialog = useCallback(async (id: string) => {
    setEditorMode("edit")
    setEditingId(id)
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const record = await fetchDepartment({ apiUrl, accessToken: token, id, organizationId: selectedOrganizationId || undefined })
      setEditorInitialValues({
        departmentName: record.departmentName ?? "",
        description: record.description ?? "",
        isActive: record.isActive !== false,
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the selected department."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [apiUrl, handleAuthFailure, selectedOrganizationId])

  const submitEditor = useCallback(async (values: DepartmentFormValues) => {
    if (!values.departmentName.trim()) {
      setEditorError("Department name is required.")
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
        await createDepartment({ apiUrl, accessToken: token, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Department created successfully.")
      } else if (editingId != null) {
        await updateDepartment({ apiUrl, accessToken: token, id: editingId, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Department updated successfully.")
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the department right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }, [apiUrl, editingId, editorMode, handleAuthFailure, selectedOrganizationId, triggerRefresh])

  const downloadTemplate = useCallback(async () => {
    if (downloadingTemplate) return

    setDownloadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const blob = await downloadDepartmentUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "department-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to download the department template right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDownloadingTemplate(false)
    }
  }, [apiUrl, downloadingTemplate, handleAuthFailure, selectedOrganizationId])

  const uploadTemplate = useCallback(async (file: File | null | undefined) => {
    if (!file || uploadingTemplate) return

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadDepartmentTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })

      toast.success(`Department upload completed. ${result.inserted} inserted, ${result.skipped} already existed.`)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to upload the department template right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setUploadingTemplate(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
  }, [apiUrl, handleAuthFailure, selectedOrganizationId, triggerRefresh, uploadingTemplate])

  const confirmSoftDelete = useCallback(async () => {
    if (!deleteTarget || deleteWorking) return
    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteDepartment({ apiUrl, accessToken: token, id: deleteTarget.id, organizationId: selectedOrganizationId || undefined })
      setRecentlyDeletedDepartment(deleteTarget)
      setDeleteTarget(null)
      toast.success("Department moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the department right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }, [apiUrl, deleteTarget, deleteWorking, handleAuthFailure, selectedOrganizationId, triggerRefresh])

  function openPendingActionDialog(department: DepartmentRecord, action: PendingDeleteMode) {
    setPendingActionTarget(department)
    setPendingActionMode(action)
  }

  const confirmPendingAction = useCallback(async () => {
    if (!pendingActionTarget || !pendingActionMode || pendingActionWorking) return
    setPendingActionWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (pendingActionMode === "restore") {
        await restoreDepartment({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Department restored successfully.")
      } else {
        await permanentlyDeleteDepartment({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Department deleted permanently.")
      }

      if (recentlyDeletedDepartment?.id === pendingActionTarget.id) setRecentlyDeletedDepartment(null)
      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to complete the delete action right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setPendingActionWorking(false)
    }
  }, [apiUrl, handleAuthFailure, pendingActionMode, pendingActionTarget, pendingActionWorking, recentlyDeletedDepartment, selectedOrganizationId, triggerRefresh])

  const deletedTotal = deletedMeta?.total ?? deletedDepartments.length
  const activeTotal = meta?.total ?? departments.length
  const activeCount = useMemo(() => departments.filter((department) => department.deleted_at == null && department.isActive !== false).length, [departments])

  if (error && departments.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">App Config</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Department Setup</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage department master data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <EmptyState title="Unable to load departments" description={error} actionLabel="Try again" onAction={triggerRefresh} />
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
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">App Config</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">Department Setup</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain department records for the selected organization.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">{activeTotal} total</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{activeCount} active</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{deletedTotal} deleted</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Refresh</Button>
                  <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" />New department</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedDepartment ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted department</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">{getDepartmentLabel(recentlyDeletedDepartment)} was soft deleted and can still be restored.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50" onClick={() => openPendingActionDialog(recentlyDeletedDepartment, "restore")}><Undo2 className="size-3.5" />Restore</Button>
                    <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedDepartment, "permanent")}><Trash2 className="size-3.5" />Delete permanently</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ActiveDepartmentSection
            data={departments}
            meta={meta}
            loading={loadingDepartments}
            page={page}
            limit={limit}
            filters={activeFilters}
            onFilterChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreate={openCreateDialog}
            onEdit={openEditDialog}
            onDelete={setDeleteTarget}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
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

          <DeletedDepartmentSection
            data={deletedDepartments}
            meta={deletedMeta}
            loading={loadingDeletedDepartments}
            page={deletedPage}
            limit={deletedLimit}
            filters={deletedFilters}
            onFilterChange={setDeletedFilters}
            onPageChange={setDeletedPage}
            onLimitChange={setDeletedLimit}
            onOpenAction={(department, mode) => openPendingActionDialog(department, mode)}
          />
        </div>
      </ScrollArea>

      <DepartmentFormDialog
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
        department={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        department={pendingActionTarget}
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
