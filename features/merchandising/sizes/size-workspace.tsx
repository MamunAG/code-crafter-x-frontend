"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
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

import { DeletedSizesCard } from "./component/deleted-sizes-card"
import { SizeFormDialog } from "./component/size-form-dialog"
import { SizeTableSection } from "./component/size-table-section"
import {
  createSize,
  fetchSize,
  fetchSizes,
  permanentlyDeleteSize,
  restoreSize,
  softDeleteSize,
  updateSize,
} from "./size.service"
import type { SizeFilterValues, SizeFormValues, SizeRecord, PaginationMeta } from "./size.types"

type SizeEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"

const DEFAULT_FILTERS: SizeFilterValues = {
  sizeName: "",
}

const DEFAULT_FORM_VALUES: SizeFormValues = {
  sizeName: "",
  isActive: true,
}

function getSizeLabel(size: SizeRecord) {
  return size.sizeName
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
  size,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  size: SizeRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete size</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {size ? getSizeLabel(size) : "this size"}
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
  size,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  size: SizeRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore size" : "Delete size permanently"
  const description =
    action === "restore"
      ? "Bring this size back into the active merchandising list."
      : "This will permanently remove the size record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {size ? getSizeLabel(size) : "this size"}
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

export function SizeWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingSizes, setLoadingSizes] = useState(true)
  const [loadingDeletedSizes, setLoadingDeletedSizes] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [sizes, setSizes] = useState<SizeRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedSizes, setDeletedSizes] = useState<SizeRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<SizeFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<SizeFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<SizeFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<SizeFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<SizeEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorValues, setEditorValues] = useState<SizeFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<SizeRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)

  const [recentlyDeletedSize, setRecentlyDeletedSize] = useState<SizeRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<SizeRecord | null>(null)
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

  const openEditDialog = useCallback(async (sizeId: number) => {
    setEditorMode("edit")
    setEditingId(sizeId)
    setEditorError("")
    setEditorSubmitting(false)
    setEditorLoading(true)
    setEditorOpen(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const record = await fetchSize({
        apiUrl,
        accessToken: token,
        id: sizeId,
      })

      setEditorValues({
        sizeName: record.sizeName ?? "",
        isActive: record.isActive !== false,
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the size record right now."

      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [apiUrl, handleAuthFailure])

  const openPendingActionDialog = useCallback(
    (size: SizeRecord, mode: PendingDeleteMode) => {
      setPendingActionTarget(size)
      setPendingActionMode(mode)
    },
    [],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadSizes() {
      setLoadingSizes(true)
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

        const response = await fetchSizes({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters: activeFilters,
        })

        if (!active) {
          return
        }

        setSizes(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load sizes right now."

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
          setLoadingSizes(false)
        }
      }
    }

    void loadSizes()

    return () => {
      active = false
    }
  }, [activeFilters, apiUrl, limit, page, refreshVersion, router])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadDeletedSizes() {
      setLoadingDeletedSizes(true)
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

        const response = await fetchSizes({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
        })

        if (!active) {
          return
        }

        setDeletedSizes(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load deleted sizes right now."

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
          setLoadingDeletedSizes(false)
        }
      }
    }

    void loadDeletedSizes()

    return () => {
      active = false
    }
  }, [apiUrl, deletedActiveFilters, deletedLimit, deletedPage, refreshVersion, router])

  const activeCount = useMemo(
    () => sizes.filter((size) => size.isActive !== false && !size.deleted_at).length,
    [sizes],
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
    setEditorMode("create")
    setEditingId(null)
    setEditorError("")
    setEditorValues(DEFAULT_FORM_VALUES)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  async function submitEditor() {
    if (editorSubmitting || editorLoading) {
      return
    }

    const trimmedName = editorValues.sizeName.trim()
    if (!trimmedName) {
      setEditorError("Size name is required.")
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
        await createSize({
          apiUrl,
          accessToken: token,
          payload: editorValues,
        })
      } else if (editingId !== null) {
        await updateSize({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: editorValues,
        })
      }

      setEditorOpen(false)
      setEditorValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
      toast.success(editorMode === "create" ? "Size saved successfully" : "Size updated successfully")
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the size right now."

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

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteSize({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
      })

      setRecentlyDeletedSize(deleteTarget)
      setDeleteTarget(null)
      triggerRefresh()
      toast.success("Size deleted successfully")
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the size right now."

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
        await restoreSize({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
        })
        toast.success("Size restored successfully")
      } else {
        await permanentlyDeleteSize({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
        })
        toast.success("Size deleted permanently")
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

  const deletedTotal = deletedMeta?.total ?? deletedSizes.length
  const activeTotal = meta?.total ?? sizes.length

  if (
    loadingSizes &&
    sizes.length === 0 &&
    loadingDeletedSizes &&
    deletedSizes.length === 0 &&
    !error &&
    !deletedError
  ) {
    return <WorkspaceSkeleton />
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
                  Sizes
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising size master data.
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
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
              <p className="text-lg font-semibold text-slate-950 dark:text-white">
                Unable to load sizes
              </p>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {error}
              </p>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="mt-4 rounded-xl">
                <RefreshCcw className="size-3.5" />
                Try again
              </Button>
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
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Merchandising master data
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Sizes
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain merchandising size records across the catalog.
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
                    {recentlyDeletedSize ? (
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
                  <Button type="button" onClick={openCreateDialog} className="rounded-xl">
                    <Plus className="size-3.5" />
                    New size
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedSize ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted size
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getSizeLabel(recentlyDeletedSize)} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                      onClick={() => openPendingActionDialog(recentlyDeletedSize, "restore")}
                    >
                      <Undo2 className="size-3.5" />
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => openPendingActionDialog(recentlyDeletedSize, "permanent")}
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <SizeTableSection
            sizes={sizes}
            meta={meta}
            page={page}
            limit={limit}
            loadingSizes={loadingSizes}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateSize={openCreateDialog}
            onEditSize={openEditDialog}
            onDeleteSize={setDeleteTarget}
            onResetFilters={resetActiveFilters}
          />

          <DeletedSizesCard
            deletedSizes={deletedSizes}
            deletedMeta={deletedMeta}
            deletedPage={deletedPage}
            deletedLimit={deletedLimit}
            loadingDeletedSizes={loadingDeletedSizes}
            deletedError={deletedError}
            deletedDraftFilters={deletedDraftFilters}
            deletedActiveFilters={deletedActiveFilters}
            onDeletedDraftFiltersChange={setDeletedDraftFilters}
            onDeletedActiveFiltersChange={setDeletedActiveFilters}
            onDeletedPageChange={setDeletedPage}
            onDeletedLimitChange={setDeletedLimit}
            onOpenAction={openPendingActionDialog}
            onRetry={triggerRefresh}
          />
        </div>
      </ScrollArea>

      <SizeFormDialog
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        values={editorValues}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditorValues(DEFAULT_FORM_VALUES)
            setEditorError("")
            setEditorLoading(false)
            setEditorSubmitting(false)
            setEditingId(null)
          }
        }}
        onChange={setEditorValues}
        onSubmit={submitEditor}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        size={deleteTarget}
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
        size={pendingActionTarget}
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
