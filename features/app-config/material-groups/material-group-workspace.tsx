"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"

import { MaterialGroupFormDialog } from "./component/material-group-form-dialog"
import {
  createMaterialGroup,
  fetchMaterialGroup,
  fetchMaterialGroups,
  permanentlyDeleteMaterialGroup,
  restoreMaterialGroup,
  softDeleteMaterialGroup,
  updateMaterialGroup,
} from "./material-group.service"
import type {
  MaterialGroupFilterValues,
  MaterialGroupFormValues,
  MaterialGroupRecord,
  PaginationMeta,
} from "./material-group.types"

type MaterialGroupEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type MaterialGroupAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

function getMaterialGroupLabel(group: MaterialGroupRecord) {
  return group.name
}

function DeleteConfirmDialog({
  open,
  group,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  group: MaterialGroupRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete material group</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {group ? getMaterialGroupLabel(group) : "this material group"}
            </span>
            . You can restore it from the recently deleted card before removing
            it permanently.
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
  group,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  group: MaterialGroupRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title =
    action === "restore"
      ? "Restore material group"
      : "Delete material group permanently"
  const description =
    action === "restore"
      ? "Bring this material group back into the active configuration list."
      : "This will permanently remove the material group record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {group ? getMaterialGroupLabel(group) : "this material group"}
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

const MATERIAL_GROUP_MENU_NAME = "Material Group Entry"
const ALL_STATUS_VALUE = "__all_statuses__"
const EMPTY_ACCESS_RULES: MaterialGroupAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}
const DEFAULT_FILTERS: MaterialGroupFilterValues = {
  name: "",
  description: "",
  isActive: "",
}
const DEFAULT_FORM_VALUES: MaterialGroupFormValues = {
  name: "",
  description: "",
  isActive: true,
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function normalizeAuthFailure(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("forbidden")
  )
}

function getStatusLabel(group: MaterialGroupRecord) {
  if (group.deleted_at) return "Deleted"
  return group.isActive === false ? "Inactive" : "Active"
}

function getStatusTone(group: MaterialGroupRecord) {
  if (group.deleted_at) return "destructive" as const
  return group.isActive === false ? "outline" as const : "secondary" as const
}

export function MaterialGroupWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingDeletedGroups, setLoadingDeletedGroups] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [groups, setGroups] = useState<MaterialGroupRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedGroups, setDeletedGroups] = useState<MaterialGroupRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [filters, setFilters] =
    useState<MaterialGroupFilterValues>(DEFAULT_FILTERS)
  const [deletedFilters, setDeletedFilters] =
    useState<MaterialGroupFilterValues>(DEFAULT_FILTERS)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId()
  )
  const [accessRules, setAccessRules] =
    useState<MaterialGroupAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] =
    useState<MaterialGroupEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] =
    useState<MaterialGroupFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaterialGroupRecord | null>(
    null
  )
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedGroup, setRecentlyDeletedGroup] =
    useState<MaterialGroupRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] =
    useState<MaterialGroupRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] =
    useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const handleAuthFailure = useCallback(
    (message: string) => {
      if (!normalizeAuthFailure(message)) return false

      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
      router.replace("/sign-in")
      return true
    },
    [router]
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    function handleOrganizationChange(event: Event) {
      const nextOrganizationId =
        event instanceof CustomEvent
          ? event.detail?.organizationId
          : readSelectedOrganizationId()

      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(
      SELECTED_ORGANIZATION_CHANGED_EVENT,
      handleOrganizationChange
    )

    return () => {
      window.removeEventListener(
        SELECTED_ORGANIZATION_CHANGED_EVENT,
        handleOrganizationChange
      )
    }
  }, [])

  const triggerRefresh = useCallback(() => {
    setRefreshVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true

    async function loadAccessRules() {
      setLoadingAccessRules(true)

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token || !selectedOrganizationId) {
          if (active) setAccessRules(EMPTY_ACCESS_RULES)
          return
        }

        const permission = await fetchCurrentMenuPermission({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId,
          menuName: MATERIAL_GROUP_MENU_NAME,
        })

        if (active) {
          setAccessRules({
            canView: Boolean(permission.canView),
            canCreate: Boolean(permission.canCreate),
            canUpdate: Boolean(permission.canUpdate),
            canDelete: Boolean(permission.canDelete),
          })
        }
      } catch {
        if (active) setAccessRules(EMPTY_ACCESS_RULES)
      } finally {
        if (active) setLoadingAccessRules(false)
      }
    }

    void loadAccessRules()

    return () => {
      active = false
    }
  }, [apiUrl, selectedOrganizationId])

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setLoadingDeletedGroups(true)
    setError("")
    setDeletedError("")

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const [activeResponse, deletedResponse] = await Promise.all([
        fetchMaterialGroups({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters,
          organizationId: selectedOrganizationId || undefined,
        }),
        fetchMaterialGroups({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        }),
      ])

      setGroups(activeResponse.items)
      setMeta(activeResponse.meta)
      setDeletedGroups(deletedResponse.items)
      setDeletedMeta(deletedResponse.meta)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load material groups right now."

      if (!handleAuthFailure(message)) {
        setError(message)
        setDeletedError(message)
        toast.error(message)
      }
    } finally {
      setLoading(false)
      setLoadingDeletedGroups(false)
    }
  }, [
    apiUrl,
    deletedFilters,
    deletedLimit,
    deletedPage,
    filters,
    handleAuthFailure,
    limit,
    page,
    selectedOrganizationId,
  ])

  useEffect(() => {
    if (typeof window === "undefined") return
    void loadGroups()
  }, [loadGroups, refreshVersion])

  function openCreateDialog() {
    setEditorMode("create")
    setEditingId(null)
    setEditorError("")
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorOpen(true)
  }

  const openEditDialog = useCallback(
    async (id: string) => {
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

        const group = await fetchMaterialGroup({
          apiUrl,
          accessToken: token,
          id,
          organizationId: selectedOrganizationId || undefined,
        })

        setEditorInitialValues({
          name: group.name ?? "",
          description: group.description ?? "",
          isActive: group.isActive !== false,
        })
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the selected material group."

        if (!handleAuthFailure(message)) {
          setEditorError(message)
          toast.error(message)
        }
      } finally {
        setEditorLoading(false)
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId]
  )

  const submitEditor = useCallback(
    async (values: MaterialGroupFormValues) => {
      if (!values.name.trim()) {
        setEditorError("Material group name is required.")
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
          await createMaterialGroup({
            apiUrl,
            accessToken: token,
            payload: values,
            organizationId: selectedOrganizationId || undefined,
          })
          toast.success("Material group created successfully.")
        } else if (editingId) {
          await updateMaterialGroup({
            apiUrl,
            accessToken: token,
            id: editingId,
            payload: values,
            organizationId: selectedOrganizationId || undefined,
          })
          toast.success("Material group updated successfully.")
        }

        setEditorOpen(false)
        setEditorInitialValues(DEFAULT_FORM_VALUES)
        setEditingId(null)
        triggerRefresh()
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to save the material group right now."

        if (!handleAuthFailure(message)) {
          setEditorError(message)
          toast.error(message)
        }
      } finally {
        setEditorSubmitting(false)
      }
    },
    [
      apiUrl,
      editorMode,
      editingId,
      handleAuthFailure,
      selectedOrganizationId,
      triggerRefresh,
    ]
  )

  const requestSoftDelete = useCallback((group: MaterialGroupRecord) => {
    setDeleteTarget(group)
  }, [])

  const confirmSoftDelete = useCallback(async () => {
    if (!deleteTarget || deleteWorking) return

    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete material groups.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteMaterialGroup({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })
      setRecentlyDeletedGroup(deleteTarget)
      setDeleteTarget(null)
      toast.success("Material group moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the material group right now."

      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }, [
    accessRules?.canDelete,
    apiUrl,
    deleteTarget,
    deleteWorking,
    handleAuthFailure,
    selectedOrganizationId,
    triggerRefresh,
  ])

  function openPendingActionDialog(
    group: MaterialGroupRecord,
    action: PendingDeleteMode
  ) {
    setPendingActionTarget(group)
    setPendingActionMode(action)
  }

  const confirmPendingAction = useCallback(async () => {
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
          toast.error("You do not have permission to restore material groups.")
          return
        }

        await restoreMaterialGroup({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Material group restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error(
            "You do not have permission to permanently delete material groups."
          )
          return
        }

        await permanentlyDeleteMaterialGroup({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Material group deleted permanently.")
      }

      if (recentlyDeletedGroup?.id === pendingActionTarget.id) {
        setRecentlyDeletedGroup(null)
      }

      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to complete the delete action right now."

      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setPendingActionWorking(false)
    }
  }, [
    accessRules?.canDelete,
    accessRules?.canUpdate,
    apiUrl,
    handleAuthFailure,
    pendingActionMode,
    pendingActionTarget,
    pendingActionWorking,
    recentlyDeletedGroup?.id,
    selectedOrganizationId,
    triggerRefresh,
  ])

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No material groups found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted material groups found"
    }
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const columns = useMemo<ColumnDef<MaterialGroupRecord>[]>(
    () => [
      {
        id: "name",
        header: "Group",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
              {row.original.name}
            </p>
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-72 text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.original.description || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={getStatusTone(row.original)}
            className="rounded-full px-3 py-1"
          >
            {getStatusLabel(row.original)}
          </Badge>
        ),
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => (
          <p className="text-xs text-slate-700 dark:text-slate-200">
            {formatDate(row.original.created_at)}
          </p>
        ),
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const hasActions = accessRules?.canUpdate || accessRules?.canDelete

          if (!hasActions) {
            return (
              <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">
                No actions
              </div>
            )
          }

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
                <DropdownMenuContent align="end" className="w-48">
                  {accessRules?.canUpdate ? (
                    <DropdownMenuItem
                      onSelect={() => openEditDialog(row.original.id)}
                    >
                      Edit material group
                    </DropdownMenuItem>
                  ) : null}
                  {accessRules?.canUpdate && accessRules?.canDelete ? (
                    <DropdownMenuSeparator />
                  ) : null}
                  {accessRules?.canDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => requestSoftDelete(row.original)}
                    >
                      Delete material group
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [accessRules, openEditDialog, requestSoftDelete]
  )

  const table = useReactTable({
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const deletedColumns = useMemo<ColumnDef<MaterialGroupRecord>[]>(
    () => [
      {
        id: "name",
        header: "Group",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">
              {row.original.name}
            </p>
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-72 text-xs font-medium text-slate-700 dark:text-slate-200">
            {row.original.description || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={getStatusTone(row.original)}
            className="rounded-full px-3 py-1"
          >
            {getStatusLabel(row.original)}
          </Badge>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => (
          <p className="text-xs text-slate-700 dark:text-slate-200">
            {formatDate(row.original.deleted_at)}
          </p>
        ),
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const hasActions = accessRules?.canUpdate || accessRules?.canDelete

          if (!hasActions) {
            return (
              <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">
                No actions
              </div>
            )
          }

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
                  {accessRules?.canUpdate ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        openPendingActionDialog(row.original, "restore")
                      }
                    >
                      Restore material group
                    </DropdownMenuItem>
                  ) : null}
                  {accessRules?.canUpdate && accessRules?.canDelete ? (
                    <DropdownMenuSeparator />
                  ) : null}
                  {accessRules?.canDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() =>
                        openPendingActionDialog(row.original, "permanent")
                      }
                    >
                      Delete permanently
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [accessRules]
  )

  const deletedTable = useReactTable({
    data: deletedGroups,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const activeTotal = meta?.total ?? groups.length
  const deletedTotal = deletedMeta?.total ?? deletedGroups.length
  const activeCount = useMemo(
    () => groups.filter((group) => group.deleted_at == null).length,
    [groups]
  )

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  if (loadingAccessRules && loading && loadingDeletedGroups) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!loadingAccessRules && accessRules && !accessRules.canView) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-semibold">Material Group Entry</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You do not have permission to view this menu for the selected
              organization.
            </p>
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
            <CardContent className="p-4 sm:p-8 sm:py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                    App configuration
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                    Material Group Entry
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create and maintain material group records for the selected
                    organization.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      Total {activeTotal}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Deleted {deletedTotal}
                    </Badge>
                    {recentlyDeletedGroup ? (
                      <Badge
                        variant="destructive"
                        className="rounded-full px-3 py-1"
                      >
                        Recently deleted
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerRefresh}
                    className="rounded-xl"
                  >
                    <RefreshCcw className="size-3.5" />
                    Refresh
                  </Button>
                  {accessRules?.canCreate ? (
                    <Button
                      type="button"
                      onClick={openCreateDialog}
                      className="rounded-xl"
                    >
                      <Plus className="size-3.5" />
                      New group
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedGroup ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted material group
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getMaterialGroupLabel(recentlyDeletedGroup)} was soft
                      deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() =>
                          openPendingActionDialog(
                            recentlyDeletedGroup,
                            "restore"
                          )
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
                          openPendingActionDialog(
                            recentlyDeletedGroup,
                            "permanent"
                          )
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

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 py-3 dark:border-white/10">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Material groups table
                  </CardTitle>
                  <CardDescription>{pageSummary}</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  Page {meta?.totalPages ? meta.page : 0} of{" "}
                  {meta?.totalPages ?? 0}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 sm:px-2">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setPage(1)
                }}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto]"
              >
                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Group name
                  </label>
                  <Input
                    value={filters.name}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setFilters({ ...filters, name: event.target.value })
                    }
                    placeholder="Input group name"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <Input
                    value={filters.description}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        description: event.target.value,
                      })
                    }
                    placeholder="Input description"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <AppSelect
                    value={filters.isActive || ALL_STATUS_VALUE}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        isActive:
                          value === ALL_STATUS_VALUE ? "" : value,
                      })
                    }
                    placeholder="All statuses"
                    options={[
                      { value: ALL_STATUS_VALUE, label: "All statuses" },
                      { value: "true", label: "Active" },
                      { value: "false", label: "Inactive" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-1">
                  <Button type="submit" className="w-full rounded-xl sm:w-auto">
                    <Search className="size-3.5" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={clearFilters}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
              {error ? (
                <div className="p-6 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              ) : (
                <AppDataTable
                  table={table}
                  pageSummary={pageSummary}
                  page={page}
                  totalPages={meta?.totalPages ?? 1}
                  pageSize={limit}
                  isLoading={loading}
                  pageSizeOptions={[5, 10, 25, 50]}
                  onPageChange={setPage}
                  onPageSizeChange={(nextPageSize) => {
                    setLimit(nextPageSize)
                    setPage(1)
                  }}
                  emptyState={
                    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                      <p className="text-sm font-semibold">
                        No material groups found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Try clearing or relaxing the current filters.
                      </p>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 py-3 dark:border-white/10">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Deleted material groups
                  </CardTitle>
                  <CardDescription>{deletedPageSummary}</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  {deletedTotal} deleted
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 sm:px-2">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setDeletedPage(1)
                }}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto]"
              >
                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Group name
                  </label>
                  <Input
                    value={deletedFilters.name}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDeletedFilters({
                        ...deletedFilters,
                        name: event.target.value,
                      })
                    }
                    placeholder="Input group name"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Description
                  </label>
                  <Input
                    value={deletedFilters.description}
                    className="h-7 rounded-md px-2 text-xs"
                    onChange={(event) =>
                      setDeletedFilters({
                        ...deletedFilters,
                        description: event.target.value,
                      })
                    }
                    placeholder="Input description"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <AppSelect
                    value={deletedFilters.isActive || ALL_STATUS_VALUE}
                    onValueChange={(value) =>
                      setDeletedFilters({
                        ...deletedFilters,
                        isActive:
                          value === ALL_STATUS_VALUE ? "" : value,
                      })
                    }
                    placeholder="All statuses"
                    options={[
                      { value: ALL_STATUS_VALUE, label: "All statuses" },
                      { value: "true", label: "Active" },
                      { value: "false", label: "Inactive" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-1">
                  <Button type="submit" className="w-full rounded-xl sm:w-auto">
                    <Search className="size-3.5" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={() => {
                      setDeletedFilters(DEFAULT_FILTERS)
                      setDeletedPage(1)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
              {deletedError ? (
                <div className="p-6 text-sm text-red-700 dark:text-red-300">
                  {deletedError}
                </div>
              ) : (
                <AppDataTable
                  table={deletedTable}
                  pageSummary={deletedPageSummary}
                  page={deletedPage}
                  totalPages={deletedMeta?.totalPages ?? 1}
                  pageSize={deletedLimit}
                  isLoading={loadingDeletedGroups}
                  pageSizeOptions={[5, 10, 25, 50]}
                  onPageChange={setDeletedPage}
                  onPageSizeChange={(nextPageSize) => {
                    setDeletedLimit(nextPageSize)
                    setDeletedPage(1)
                  }}
                  emptyState={
                    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                      <p className="text-sm font-semibold">
                        No deleted material groups found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Try clearing or relaxing the current filters.
                      </p>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <MaterialGroupFormDialog
        open={editorOpen}
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        mode={editorMode}
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
        group={deleteTarget}
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
        group={pendingActionTarget}
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
