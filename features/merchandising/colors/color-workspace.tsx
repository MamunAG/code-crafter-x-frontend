"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Paintbrush,
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

import { ColorFormDialog } from "./component/color-form-dialog"
import { ColorTableSection } from "./component/color-table-section"
import { DeletedColorsCard } from "./component/deleted-colors-card"
import {
  createColor,
  fetchColor,
  fetchColors,
  permanentlyDeleteColor,
  restoreColor,
  softDeleteColor,
  updateColor,
} from "./color.service"
import type {
  ColorFilterValues,
  ColorFormValues,
  ColorRecord,
  PaginationMeta,
} from "./color.types"

type ColorEditorMode = "create" | "edit"
type PendingDeleteMode = "soft" | "restore" | "permanent"

const DEFAULT_FILTERS: ColorFilterValues = {
  colorName: "",
  colorDisplayName: "",
  colorDescription: "",
}

const DEFAULT_FORM_VALUES: ColorFormValues = {
  colorName: "",
  colorDisplayName: "",
  colorDescription: "",
  colorHexCode: "",
  isActive: true,
}

function getColorLabel(color: ColorRecord) {
  return color.colorDisplayName?.trim() || color.colorName
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
        <Paintbrush className="size-5" />
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
  color,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  color: ColorRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete color</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {color ? getColorLabel(color) : "this color"}
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
  color,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  color: ColorRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title =
    action === "restore"
      ? "Restore color"
      : "Delete color permanently"
  const description =
    action === "restore"
      ? "Bring this color back into the active merchandising list."
      : "This will permanently remove the color record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {color ? getColorLabel(color) : "this color"}
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

export function ColorWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingColors, setLoadingColors] = useState(true)
  const [loadingDeletedColors, setLoadingDeletedColors] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [colors, setColors] = useState<ColorRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedColors, setDeletedColors] = useState<ColorRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<ColorFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<ColorFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<ColorFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<ColorFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<ColorEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<ColorFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ColorRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)

  const [recentlyDeletedColor, setRecentlyDeletedColor] = useState<ColorRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<ColorRecord | null>(null)
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

  const openEditDialog = useCallback(async (colorId: number) => {
    setEditorMode("edit")
    setEditingId(colorId)
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

      const record = await fetchColor({
        apiUrl,
        accessToken: token,
        id: colorId,
      })

      setEditorInitialValues({
        colorName: record.colorName ?? "",
        colorDisplayName: record.colorDisplayName ?? "",
        colorDescription: record.colorDescription ?? "",
        colorHexCode: record.colorHexCode ?? "",
        isActive: record.isActive !== false,
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the color record right now."

      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [apiUrl, handleAuthFailure])

  const openPendingActionDialog = useCallback(
    (color: ColorRecord, mode: PendingDeleteMode) => {
      setPendingActionTarget(color)
      setPendingActionMode(mode)
    },
    [],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadColors() {
      setLoadingColors(true)
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

        const response = await fetchColors({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters: activeFilters,
        })

        if (!active) {
          return
        }

        setColors(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load colors right now."

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
          setLoadingColors(false)
        }
      }
    }

    void loadColors()

    return () => {
      active = false
    }
  }, [activeFilters, apiUrl, limit, page, refreshVersion, router])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadDeletedColors() {
      setLoadingDeletedColors(true)
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

        const response = await fetchColors({
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

        setDeletedColors(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load deleted colors right now."

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
          setLoadingDeletedColors(false)
        }
      }
    }

    void loadDeletedColors()

    return () => {
      active = false
    }
  }, [apiUrl, deletedActiveFilters, deletedLimit, deletedPage, refreshVersion, router])

  const activeCount = useMemo(
    () => colors.filter((color) => color.isActive !== false && !color.deleted_at).length,
    [colors],
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
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  async function submitEditor(values: ColorFormValues) {
    if (editorSubmitting || editorLoading) {
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
        await createColor({
          apiUrl,
          accessToken: token,
          payload: values,
        })
        toast.success("Color created successfully.")
      } else if (editingId != null) {
        await updateColor({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: values,
        })
        toast.success("Color updated successfully.")
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the color right now."

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

      await softDeleteColor({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
      })

      setRecentlyDeletedColor(deleteTarget)
      setDeleteTarget(null)
      toast.success("Color moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the color right now."

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
        await restoreColor({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
        })
        toast.success("Color restored successfully.")
      } else {
        await permanentlyDeleteColor({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
        })
        toast.success("Color deleted permanently.")
      }

      if (recentlyDeletedColor?.id === pendingActionTarget.id) {
        setRecentlyDeletedColor(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedColors.length
  const activeTotal = meta?.total ?? colors.length

  if (
    loadingColors &&
    colors.length === 0 &&
    loadingDeletedColors &&
    deletedColors.length === 0 &&
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
                  Colors
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising color master data.
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
          title="Unable to load colors"
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
                    Colors
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain merchandising color records across the catalog.
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
                    {recentlyDeletedColor ? (
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
                    New color
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedColor ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted color
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getColorLabel(recentlyDeletedColor)} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                      onClick={() =>
                        openPendingActionDialog(recentlyDeletedColor, "restore")
                      }
                    >
                      <Undo2 className="size-3.5" />
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() =>
                        openPendingActionDialog(recentlyDeletedColor, "permanent")
                      }
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <ColorTableSection
            colors={colors}
            meta={meta}
            page={page}
            limit={limit}
            loadingColors={loadingColors}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateColor={openCreateDialog}
            onEditColor={openEditDialog}
            onDeleteColor={setDeleteTarget}
            onResetFilters={resetActiveFilters}
          />

          <DeletedColorsCard
            deletedColors={deletedColors}
            deletedMeta={deletedMeta}
            deletedPage={deletedPage}
            deletedLimit={deletedLimit}
            loadingDeletedColors={loadingDeletedColors}
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

      <ColorFormDialog
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
        color={deleteTarget}
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
        color={pendingActionTarget}
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
