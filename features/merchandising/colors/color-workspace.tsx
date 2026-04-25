"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  colorHexCode: "",
  isActive: true,
}

const NEUTRAL_COLOR_SWATCH = "#9CA3AF"

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

function isValidHexColorCode(value: string) {
  return /^#?[0-9A-Fa-f]{6}$/.test(value.trim())
}

function normalizeHexColorCode(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

function getPickerColorValue(hexCode: string) {
  if (isValidHexColorCode(hexCode)) {
    return normalizeHexColorCode(hexCode)
  }

  return NEUTRAL_COLOR_SWATCH
}

function getColorSwatchColor(color: ColorRecord) {
  if (color.colorHexCode && isValidHexColorCode(color.colorHexCode)) {
    return normalizeHexColorCode(color.colorHexCode)
  }

  return NEUTRAL_COLOR_SWATCH
}

function getColorLabel(color: ColorRecord) {
  return color.colorDisplayName?.trim() || color.colorName
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
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
                Color name <span className="text-red-500">*</span>
              </label>
              <Input
                id="colorName"
                value={values.colorName}
                required
                onChange={(event) =>
                  onChange({ ...values, colorName: event.target.value })
                }
                placeholder="Input color name"
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
                placeholder="Input color display name"
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
                placeholder="Input description"
                className="min-h-24"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="colorHexCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Hex color code
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="colorHexCode"
                  value={values.colorHexCode}
                  onChange={(event) =>
                    onChange({ ...values, colorHexCode: event.target.value })
                  }
                  placeholder="Input hex color code"
                  className="sm:flex-1"
                />
                <label
                  htmlFor="colorHexCodePicker"
                  className="size-8 shrink-0 cursor-pointer rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-105 dark:border-white/10"
                  style={{
                    backgroundColor: isValidHexColorCode(values.colorHexCode)
                      ? normalizeHexColorCode(values.colorHexCode)
                      : NEUTRAL_COLOR_SWATCH,
                  }}
                >
                  <span className="sr-only">Pick a color</span>
                  <Input
                    id="colorHexCodePicker"
                    type="color"
                    aria-label="Pick a color"
                    value={getPickerColorValue(values.colorHexCode)}
                    onChange={(event) =>
                      onChange({
                        ...values,
                        colorHexCode: normalizeHexColorCode(event.target.value),
                      })
                    }
                    className="sr-only"
                  />
                </label>
              </div>
              <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                Optional. Use a 6-digit hex value such as #1E88E5.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]">
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
  const [editorValues, setEditorValues] = useState<ColorFormValues>(DEFAULT_FORM_VALUES)
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

  const columns = useMemo<ColumnDef<ColorRecord>[]>(
    () => [
      {
        id: "color",
        header: "Color",
        cell: ({ row }) => {
          const color = row.original
          const swatch = getColorSwatchColor(color)

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
            {row.original.colorDisplayName?.trim() || "Not set"}
          </span>
        ),
      },
      {
        id: "hexCode",
        header: "Hex code",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.original.colorHexCode?.trim() || "Not set"}
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
        id: "created",
        header: "Created",
        cell: ({ row }) => {
          const color = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(color.created_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(color.created_by_user, color.created_by_id)
                  ? `Created by ${getUserLabel(color.created_by_user, color.created_by_id)}`
                  : "No creator metadata"}
              </p>
            </div>
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
                {getUserLabel(color.updated_by_user, color.updated_by_id)
                  ? `Updated by ${getUserLabel(color.updated_by_user, color.updated_by_id)}`
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

  const deletedColumns = useMemo<ColumnDef<ColorRecord>[]>(
    () => [
      {
        id: "color",
        header: "Color",
        cell: ({ row }) => {
          const color = row.original
          const swatch = getColorSwatchColor(color)

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
            {row.original.colorDisplayName?.trim() || "Not set"}
          </span>
        ),
      },
      {
        id: "hexCode",
        header: "Hex code",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.original.colorHexCode?.trim() || "Not set"}
          </span>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const color = row.original

          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {formatDate(color.deleted_at)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(color.deleted_by_user, color.deleted_by_id)
                  ? `Deleted by ${getUserLabel(color.deleted_by_user, color.deleted_by_id)}`
                  : "Deleted item"}
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
                    <span className="sr-only">Open deleted item actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => openPendingActionDialog(color, "restore")}>
                    Restore color
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => openPendingActionDialog(color, "permanent")}
                  >
                    Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [openPendingActionDialog],
  )

  const deletedTable = useReactTable({
    data: deletedColors,
    columns: deletedColumns,
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

  const filterCount = useMemo(
    () =>
      [draftFilters.colorName, draftFilters.colorDisplayName, draftFilters.colorDescription].filter(
        (value) => value.trim(),
      ).length,
    [draftFilters],
  )

  const deletedFilterCount = useMemo(
    () =>
      [
        deletedDraftFilters.colorName,
        deletedDraftFilters.colorDisplayName,
        deletedDraftFilters.colorDescription,
      ].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
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

  const activeTotal = meta?.total ?? colors.length
  const deletedTotal = deletedMeta?.total ?? deletedColors.length
  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) {
      return "No colors found"
    }

    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted colors found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFiltersActive =
    deletedActiveFilters.colorName ||
    deletedActiveFilters.colorDisplayName ||
    deletedActiveFilters.colorDescription

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

          <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">Filters</CardTitle>
                  <CardDescription className="text-xs">
                    Search by color name, display name, or description.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                  {filterCount} active filter{filterCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-0 sm:px-2">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setActiveFilters(draftFilters)
                  setPage(1)
                }}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="min-w-0 space-y-1">
                  <label htmlFor="filterColorName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Color name
                  </label>
                  <Input
                    id="filterColorName"
                    value={draftFilters.colorName}
                    className="h-9 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDraftFilters({
                        ...draftFilters,
                        colorName: event.target.value,
                      })
                    }
                    placeholder="Input color name"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label htmlFor="filterColorDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Display name
                  </label>
                  <Input
                    id="filterColorDisplayName"
                    value={draftFilters.colorDisplayName}
                    className="h-9 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDraftFilters({
                        ...draftFilters,
                        colorDisplayName: event.target.value,
                      })
                    }
                    placeholder="Input color display name"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label htmlFor="filterColorDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <Input
                    id="filterColorDescription"
                    value={draftFilters.colorDescription}
                    className="h-9 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDraftFilters({
                        ...draftFilters,
                        colorDescription: event.target.value,
                      })
                    }
                    placeholder="Input description"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-1">
                  <Button type="submit" className="w-full rounded-xl sm:w-auto">
                    <Search className="size-3.5" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
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
              <div className="lg:hidden">
                {loadingColors ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-28 rounded-2xl" />
                    ))}
                  </div>
                ) : colors.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {colors.map((color) => {
                      const statusTone = colorBadgeTone(color)
                      const statusLabel = color.deleted_at
                        ? "Deleted"
                        : color.isActive === false
                          ? "Inactive"
                          : "Active"

                      return (
                        <article key={color.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <span
                                  className="size-9 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/10"
                                  style={{ backgroundColor: getColorSwatchColor(color) }}
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                                    {getColorLabel(color)}
                                  </p>
                                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {color.colorName}
                                  </p>
                                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {color.colorHexCode?.trim() || "Not set"}
                                  </p>
                                </div>
                              </div>
                            </div>

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

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={statusTone} className="rounded-full px-3 py-1">
                              {statusLabel}
                            </Badge>
                            {color.deleted_at ? (
                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                Deleted record
                              </Badge>
                            ) : null}
                          </div>

                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {color.colorDescription || "No description provided."}
                          </p>

                          <div className="mt-4 flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <div className="space-y-1">
                              <span className="block">Created: {formatDate(color.created_at)}</span>
                              <span className="block">Updated: {formatDate(color.updated_at || color.created_at)}</span>
                            </div>
                            <span>#{color.id}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4">
                    <EmptyState
                      title="No colors found"
                      description={
                        [activeFilters.colorName, activeFilters.colorDisplayName, activeFilters.colorDescription].some((value) => value.trim())
                          ? "Try clearing or relaxing the current filters."
                          : "Create the first merchandising color to get started."
                      }
                      actionLabel={
                        activeFilters.colorName || activeFilters.colorDisplayName || activeFilters.colorDescription
                          ? "Reset filters"
                          : "New color"
                      }
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
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pageSummary}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-xl"
                      onClick={() => setPage(1)}
                      disabled={loadingColors || page <= 1}
                    >
                      <ChevronsLeft className="size-3.5" />
                      <span className="sr-only">Go to first page</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-xl"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={loadingColors || page <= 1}
                    >
                      <ChevronLeft className="size-3.5" />
                      <span className="sr-only">Previous page</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-xl"
                      onClick={() => setPage((current) => Math.min(meta?.totalPages ?? 1, current + 1))}
                      disabled={loadingColors || page >= (meta?.totalPages ?? 1)}
                    >
                      <ChevronRight className="size-3.5" />
                      <span className="sr-only">Next page</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-xl"
                      onClick={() => setPage(meta?.totalPages ?? 1)}
                      disabled={loadingColors || page >= (meta?.totalPages ?? 1)}
                    >
                      <ChevronsRight className="size-3.5" />
                      <span className="sr-only">Go to last page</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block">
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
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Deleted colors</CardTitle>
                  <CardDescription>
                    Restore older soft deleted colors or remove them permanently.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  {deletedTotal} deleted
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {deletedError ? (
                <div className="p-4 sm:p-6">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    <p className="font-semibold">Unable to load deleted colors</p>
                    <p className="mt-1 leading-6">{deletedError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 rounded-xl"
                      onClick={triggerRefresh}
                    >
                      <RefreshCcw className="size-3.5" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-200/70 px-4 pb-4 dark:border-white/10 sm:px-6">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Deleted filters
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Search by color name, display name, or description.
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                        {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        setDeletedActiveFilters(deletedDraftFilters)
                        setDeletedPage(1)
                      }}
                      className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <label htmlFor="deletedFilterColorName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Color name
                        </label>
                        <Input
                          id="deletedFilterColorName"
                          value={deletedDraftFilters.colorName}
                          className="h-9 rounded-md px-2 text-xs"
                          onChange={(event) =>
                            setDeletedDraftFilters({
                              ...deletedDraftFilters,
                              colorName: event.target.value,
                            })
                          }
                          placeholder="Input color name"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <label htmlFor="deletedFilterColorDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Display name
                        </label>
                        <Input
                          id="deletedFilterColorDisplayName"
                          value={deletedDraftFilters.colorDisplayName}
                          className="h-9 rounded-md px-2 text-xs"
                          onChange={(event) =>
                            setDeletedDraftFilters({
                              ...deletedDraftFilters,
                              colorDisplayName: event.target.value,
                            })
                          }
                          placeholder="Input color display name"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <label htmlFor="deletedFilterColorDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Description
                        </label>
                        <Input
                          id="deletedFilterColorDescription"
                          value={deletedDraftFilters.colorDescription}
                          className="h-9 rounded-md px-2 text-xs"
                          onChange={(event) =>
                            setDeletedDraftFilters({
                              ...deletedDraftFilters,
                              colorDescription: event.target.value,
                            })
                          }
                          placeholder="Input description"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-1">
                        <Button type="submit" className="w-full rounded-xl sm:w-auto">
                          <Search className="size-3.5" />
                          Search
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl sm:w-auto"
                          onClick={() => {
                            setDeletedDraftFilters(DEFAULT_FILTERS)
                            setDeletedActiveFilters(DEFAULT_FILTERS)
                            setDeletedPage(1)
                          }}
                          disabled={!deletedFiltersActive && deletedFilterCount === 0}
                        >
                          Reset
                        </Button>
                      </div>
                    </form>
                  </div>
                  <div className="lg:hidden">
                    {loadingDeletedColors ? (
                      <div className="space-y-3 p-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-28 rounded-2xl" />
                        ))}
                      </div>
                    ) : deletedColors.length > 0 ? (
                      <div className="space-y-3 p-4">
                        {deletedColors.map((color) => (
                            <article
                              key={color.id}
                              className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
                            >
                              <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="size-9 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/10"
                                    style={{ backgroundColor: getColorSwatchColor(color) }}
                                  />
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                      Color name
                                    </p>
                                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                                      {color.colorName}
                                    </p>
                                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                      Display name
                                    </p>
                                    <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                                      {color.colorDisplayName?.trim() || "Not set"}
                                    </p>
                                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                      Hex code
                                    </p>
                                    <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                                      {color.colorHexCode?.trim() || "Not set"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="rounded-full"
                                  >
                                    <MoreHorizontal className="size-3.5" />
                                    <span className="sr-only">Open deleted color actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onSelect={() => openPendingActionDialog(color, "restore")}
                                  >
                                    Restore color
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => openPendingActionDialog(color, "permanent")}
                                  >
                                    Delete permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                              Deleted: {formatDate(color.deleted_at)}
                            </p>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              Deleted by{" "}
                              {getUserLabel(color.deleted_by_user, color.deleted_by_id) || "Unknown"}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            No deleted colors found
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Soft deleted colors will appear here when users remove them.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {deletedPageSummary}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => setDeletedPage(1)}
                          disabled={loadingDeletedColors || deletedPage <= 1}
                        >
                          <ChevronsLeft className="size-3.5" />
                          <span className="sr-only">Go to first deleted page</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => setDeletedPage((current) => Math.max(1, current - 1))}
                          disabled={loadingDeletedColors || deletedPage <= 1}
                        >
                          <ChevronLeft className="size-3.5" />
                          <span className="sr-only">Previous deleted page</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() =>
                            setDeletedPage((current) =>
                              Math.min(deletedMeta?.totalPages ?? 1, current + 1),
                            )
                          }
                          disabled={loadingDeletedColors || deletedPage >= (deletedMeta?.totalPages ?? 1)}
                        >
                          <ChevronRight className="size-3.5" />
                          <span className="sr-only">Next deleted page</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => setDeletedPage(deletedMeta?.totalPages ?? 1)}
                          disabled={loadingDeletedColors || deletedPage >= (deletedMeta?.totalPages ?? 1)}
                        >
                          <ChevronsRight className="size-3.5" />
                          <span className="sr-only">Go to last deleted page</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block">
                    <AppDataTable
                      table={deletedTable}
                      pageSummary={deletedPageSummary}
                      page={deletedPage}
                      totalPages={deletedMeta?.totalPages ?? 1}
                      pageSize={deletedLimit}
                      isLoading={loadingDeletedColors}
                      pageSizeOptions={[5, 10, 25]}
                      onPageChange={(nextPage) => setDeletedPage(nextPage)}
                      onPageSizeChange={(nextPageSize) => {
                        setDeletedLimit(nextPageSize)
                        setDeletedPage(1)
                      }}
                      emptyState={
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            No deleted colors found
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Soft deleted colors will appear here when users remove them.
                          </p>
                        </div>
                      }
                    />
                  </div>
                </>
              )}
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
