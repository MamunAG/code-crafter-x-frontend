"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  MoreHorizontal,
  Paintbrush,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

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
  isActive: true,
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function colorBadgeTone(color?: ColorRecord | null) {
  if (!color) {
    return "outline" as const
  }

  if (color.deleted_at) {
    return "destructive" as const
  }

  return color.isActive === false ? "outline" : "secondary"
}

function buildColorSwatch(name: string) {
  const trimmed = name.trim() || "Color"
  let hash = 0

  for (let index = 0; index < trimmed.length; index += 1) {
    hash = trimmed.charCodeAt(index) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 72% 55%)`
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
    <div className="space-y-6">
      <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-4 w-[32rem] max-w-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
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
  )
}

function ColorFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  values,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean
  mode: ColorEditorMode
  loading: boolean
  submitting: boolean
  error: string
  values: ColorFormValues
  onOpenChange: (open: boolean) => void
  onChange: (nextValues: ColorFormValues) => void
  onSubmit: () => void
}) {
  const title = mode === "create" ? "Create color" : "Edit color"
  const description =
    mode === "create"
      ? "Add a merchandising color master record."
      : "Update the selected merchandising color master record."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        ) : (
          <div className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="colorName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Color name
              </label>
              <Input
                id="colorName"
                value={values.colorName}
                onChange={(event) =>
                  onChange({ ...values, colorName: event.target.value })
                }
                placeholder="Blue"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="colorDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Display name
              </label>
              <Input
                id="colorDisplayName"
                value={values.colorDisplayName}
                onChange={(event) =>
                  onChange({ ...values, colorDisplayName: event.target.value })
                }
                placeholder="Ocean Blue"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="colorDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <Textarea
                id="colorDescription"
                value={values.colorDescription}
                onChange={(event) =>
                  onChange({ ...values, colorDescription: event.target.value })
                }
                placeholder="Deep blue shade used for denim."
                className="min-h-24"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  Active
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Active colors are available for use in merchandising flows.
                </p>
              </div>
              <Switch
                checked={values.isActive}
                onCheckedChange={(checked) =>
                  onChange({ ...values, isActive: Boolean(checked) })
                }
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading || submitting}
            className="rounded-xl"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {mode === "create" ? "Create color" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [error, setError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [colors, setColors] = useState<ColorRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [draftFilters, setDraftFilters] = useState<ColorFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<ColorFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<ColorEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorValues, setEditorValues] = useState<ColorFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ColorRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)

  const [recentlyDeletedColor, setRecentlyDeletedColor] = useState<ColorRecord | null>(null)
  const [recentAction, setRecentAction] = useState<PendingDeleteMode | null>(null)
  const [recentActionWorking, setRecentActionWorking] = useState(false)

  const columns = useMemo<ColumnDef<ColorRecord>[]>(
    () => [
      {
        id: "color",
        header: "Color",
        cell: ({ row }) => {
          const color = row.original
          const swatch = buildColorSwatch(color.colorName)

          return (
            <div className="pl-4">
              <div className="flex items-center gap-3">
                <span
                  className="size-8 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/10"
                  style={{ backgroundColor: swatch }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
                    {color.colorName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    ID #{color.id}
                  </p>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: "displayName",
        header: "Display name",
        cell: ({ row }) => (
          <span className="text-xs text-slate-700 dark:text-slate-200">
            {row.original.colorDisplayName || "Not set"}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-[22rem] whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300">
            {row.original.colorDescription || "No description provided."}
          </p>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const color = row.original
          const statusTone = colorBadgeTone(color)
          const statusLabel = color.deleted_at
            ? "Deleted"
            : color.isActive === false
              ? "Inactive"
              : "Active"

          return (
            <Badge variant={statusTone} className="rounded-full px-3 py-1">
              {statusLabel}
            </Badge>
          )
        },
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
          const color = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(color.updated_at || color.created_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {color.updated_by_id
                  ? `Updated by ${color.updated_by_id}`
                  : "No editor metadata"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const color = row.original

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                  >
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => openEditDialog(color.id)}>
                    Edit color
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteTarget(color)}
                  >
                    Delete color
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [openEditDialog],
  )

  const table = useReactTable({
    data: colors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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

  const activeCount = useMemo(
    () => colors.filter((color) => color.isActive !== false && !color.deleted_at).length,
    [colors],
  )

  const filterCount = useMemo(
    () =>
      [draftFilters.colorName, draftFilters.colorDisplayName, draftFilters.colorDescription].filter(
        (value) => value.trim(),
      ).length,
    [draftFilters],
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No colors found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  function handleAuthFailure(message: string) {
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

  async function openEditDialog(colorId: number) {
    setEditorMode("edit")
    setEditingId(colorId)
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

      const record = await fetchColor({
        apiUrl,
        accessToken: token,
        id: colorId,
      })

      setEditorValues({
        colorName: record.colorName ?? "",
        colorDisplayName: record.colorDisplayName ?? "",
        colorDescription: record.colorDescription ?? "",
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
  }

  async function submitEditor() {
    if (editorSubmitting || editorLoading) {
      return
    }

    const trimmedName = editorValues.colorName.trim()
    if (!trimmedName) {
      setEditorError("Color name is required.")
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
          payload: editorValues,
        })
        toast.success("Color created successfully.")
      } else if (editingId != null) {
        await updateColor({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: editorValues,
        })
        toast.success("Color updated successfully.")
      }

      setEditorOpen(false)
      setEditorValues(DEFAULT_FORM_VALUES)
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

  async function confirmRecentAction() {
    if (!recentlyDeletedColor || !recentAction || recentActionWorking) {
      return
    }

    setRecentActionWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (recentAction === "restore") {
        await restoreColor({
          apiUrl,
          accessToken: token,
          id: recentlyDeletedColor.id,
        })
        toast.success("Color restored successfully.")
      } else {
        await permanentlyDeleteColor({
          apiUrl,
          accessToken: token,
          id: recentlyDeletedColor.id,
        })
        toast.success("Color deleted permanently.")
      }

      setRecentlyDeletedColor(null)
      setRecentAction(null)
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
      setRecentActionWorking(false)
    }
  }

  if (loadingColors && colors.length === 0 && !error) {
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

  const total = meta?.total ?? colors.length

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Merchandising master data
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Colors
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain merchandising color records across the catalog.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Total {total}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    {recentlyDeletedColor ? (
                      <Badge variant="destructive" className="rounded-full px-3 py-1">
                        Recently deleted
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
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
                      onClick={() => setRecentAction("restore")}
                    >
                      <Undo2 className="size-3.5" />
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => setRecentAction("permanent")}
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Filters</CardTitle>
                  <CardDescription>
                    Search by color name, display name, or description.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  {filterCount} active filter{filterCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setActiveFilters(draftFilters)
                  setPage(1)
                }}
                className="flex flex-wrap gap-3"
              >
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <label htmlFor="filterColorName" className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Color name
                  </label>
                  <Input
                    id="filterColorName"
                    value={draftFilters.colorName}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDraftFilters({
                        ...draftFilters,
                        colorName: event.target.value,
                      })
                    }
                    placeholder="Blue"
                  />
                </div>
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <label htmlFor="filterColorDisplayName" className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Display name
                  </label>
                  <Input
                    id="filterColorDisplayName"
                    value={draftFilters.colorDisplayName}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDraftFilters({
                        ...draftFilters,
                        colorDisplayName: event.target.value,
                      })
                    }
                    placeholder="Ocean Blue"
                  />
                </div>
                <div className="min-w-[16rem] flex-[1.4] space-y-1">
                  <label htmlFor="filterColorDescription" className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <Input
                    id="filterColorDescription"
                    value={draftFilters.colorDescription}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDraftFilters({
                        ...draftFilters,
                        colorDescription: event.target.value,
                      })
                    }
                    placeholder="Deep blue shade used for denim."
                  />
                </div>
                <div className="flex min-w-[10rem] items-end justify-end gap-2">
                  <Button type="submit" className="w-24 rounded-xl">
                    <Search className="size-3.5" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-24 rounded-xl"
                    onClick={() => {
                      setDraftFilters(DEFAULT_FILTERS)
                      setActiveFilters(DEFAULT_FILTERS)
                      setPage(1)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Colors table</CardTitle>
                  <CardDescription>{pageSummary}</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <AppDataTable
                table={table}
                pageSummary={pageSummary}
                page={page}
                totalPages={meta?.totalPages ?? 1}
                pageSize={limit}
                isLoading={loadingColors}
                pageSizeOptions={[10, 25, 50, 100]}
                onPageChange={(nextPage) => setPage(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  setLimit(nextPageSize)
                  setPage(1)
                }}
                emptyState={
                  <EmptyState
                    title="No colors found"
                    description={
                      [activeFilters.colorName, activeFilters.colorDisplayName, activeFilters.colorDescription].some((value) => value.trim())
                        ? "Try clearing or relaxing the current filters."
                        : "Create the first merchandising color to get started."
                    }
                    actionLabel={activeFilters.colorName || activeFilters.colorDisplayName || activeFilters.colorDescription ? "Reset filters" : "New color"}
                    onAction={
                      activeFilters.colorName || activeFilters.colorDisplayName || activeFilters.colorDescription
                        ? () => {
                            setDraftFilters(DEFAULT_FILTERS)
                            setActiveFilters(DEFAULT_FILTERS)
                            setPage(1)
                          }
                        : openCreateDialog
                    }
                  />
                }
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <ColorFormDialog
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
        open={Boolean(recentAction && recentlyDeletedColor)}
        action={recentAction ?? "restore"}
        color={recentlyDeletedColor}
        working={recentActionWorking}
        onOpenChange={(open) => {
          if (!open) {
            setRecentAction(null)
          }
        }}
        onConfirm={confirmRecentAction}
      />
    </div>
  )
}
