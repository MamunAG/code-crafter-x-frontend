"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

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
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

import { MenuFormDialog } from "./component/menu-form-dialog"
import { MenuTableSection } from "./component/menu-table-section"
import { createMenu, deleteMenu, fetchMenus, updateMenu } from "./menu.service"
import type { MenuFilterValues, MenuFormValues, MenuRecord, PaginationMeta } from "./menu.types"

type MenuEditorMode = "create" | "edit"

const DEFAULT_FILTERS: MenuFilterValues = {
  menuName: "",
  menuPath: "",
  isActive: "all",
}

const DEFAULT_FORM_VALUES: MenuFormValues = {
  menuName: "",
  menuPath: "",
  description: "",
  displayOrder: 0,
  isActive: true,
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

          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-[28rem] rounded-3xl" />
        </div>
      </ScrollArea>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  menu,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  menu: MenuRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete menu</AlertDialogTitle>
          <AlertDialogDescription>
            This will move{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {menu?.menuName || "this menu"}
            </span>{" "}
            to the deleted state. You can still manage it from the list after refresh.
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

export function MenuWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [error, setError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [menus, setMenus] = useState<MenuRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [draftFilters, setDraftFilters] = useState<MenuFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<MenuFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<MenuEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<MenuFormValues>(DEFAULT_FORM_VALUES)
  const [editingMenu, setEditingMenu] = useState<MenuRecord | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<MenuRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)

  const activeCount = useMemo(() => menus.filter((menu) => menu.isActive).length, [menus])
  const inactiveCount = useMemo(() => menus.filter((menu) => !menu.isActive).length, [menus])
  const totalMenus = meta?.total ?? menus.length

  const loadMenus = useCallback(
    async ({ nextPage = page, silent = false } = {}) => {
      const accessToken = window.localStorage.getItem("access_token")

      if (!accessToken) {
        setMenus([])
        setMeta(null)
        setLoadingMenus(false)
        return
      }

      if (!silent) {
        setLoadingMenus(true)
      }

      try {
        setError("")
        const result = await fetchMenus({
          apiUrl,
          accessToken,
          filters: activeFilters,
          page: nextPage,
          limit,
        })

        setMenus(result.items)
        setMeta(result.meta)
        setPage(result.meta.page)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Unable to load menu entries right now."

        if (!normalizeAuthFailure(message)) {
          setError(message)
          toast.error(message)
        } else {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("access_token")
            window.localStorage.removeItem("refresh_token")
            window.localStorage.removeItem("auth_user")
          }
          router.replace("/sign-in")
        }
      } finally {
        setLoadingMenus(false)
      }
    },
    [activeFilters, apiUrl, limit, page, router],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    void loadMenus({ nextPage: page })
  }, [loadMenus, page, refreshVersion])

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setActiveFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function openCreateDialog() {
    setEditorMode("create")
    setEditingMenu(null)
    setEditorError("")
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  function openEditDialog(menu: MenuRecord) {
    setEditorMode("edit")
    setEditingMenu(menu)
    setEditorError("")
    setEditorInitialValues({
      menuName: menu.menuName,
      menuPath: menu.menuPath,
      description: menu.description || "",
      displayOrder: menu.displayOrder,
      isActive: menu.isActive,
    })
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  async function submitEditor(values: MenuFormValues) {
    if (editorSubmitting || editorLoading) {
      return
    }

    setEditorSubmitting(true)
    setEditorError("")

    try {
      const accessToken = window.localStorage.getItem("access_token")

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.")
      }

      if (editorMode === "create") {
        await createMenu({
          apiUrl,
          accessToken,
          payload: values,
        })
        toast.success("Menu created successfully.")
      } else if (editingMenu) {
        await updateMenu({
          apiUrl,
          accessToken,
          id: editingMenu.id,
          payload: values,
        })
        toast.success("Menu updated successfully.")
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingMenu(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to save the menu right now."

      if (normalizeAuthFailure(message)) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
        }
        router.replace("/sign-in")
        return
      }

      setEditorError(message)
      toast.error(message)
    } finally {
      setEditorSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteWorking) {
      return
    }

    setDeleteWorking(true)

    try {
      const accessToken = window.localStorage.getItem("access_token")

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.")
      }

      await deleteMenu({
        apiUrl,
        accessToken,
        id: deleteTarget.id,
      })

      setDeleteTarget(null)
      toast.success("Menu deleted successfully.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to delete the menu right now."

      if (normalizeAuthFailure(message)) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
        }
        router.replace("/sign-in")
        return
      }

      toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }

  const loadingInitial = loadingMenus && menus.length === 0 && !error

  if (loadingInitial) {
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
                  App Config
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Menus</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage application menu entries.
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
          title="Unable to load menus"
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
                    App config master data
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Menus
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain application menu entries.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Total {totalMenus}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Inactive {inactiveCount}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                    <RefreshCcw className="size-3.5" />
                    Refresh
                  </Button>
                  <Button type="button" onClick={openCreateDialog} className="rounded-xl">
                    <Plus className="size-3.5" />
                    New menu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <MenuTableSection
            menus={menus}
            meta={meta}
            page={page}
            limit={limit}
            loadingMenus={loadingMenus}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateMenu={openCreateDialog}
            onEditMenu={openEditDialog}
            onDeleteMenu={setDeleteTarget}
            onResetFilters={resetFilters}
          />
        </div>
      </ScrollArea>

      <MenuFormDialog
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
            setEditingMenu(null)
          }
        }}
        onSubmit={submitEditor}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        menu={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
