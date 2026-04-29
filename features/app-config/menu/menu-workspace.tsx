"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
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

import { DeletedMenusCard } from "./component/deleted-menus-card"
import { MenuFormDialog } from "./component/menu-form-dialog"
import { MenuTableSection } from "./component/menu-table-section"
import {
  createMenu,
  deleteMenu,
  fetchMenus,
  permanentlyDeleteMenu,
  restoreMenu,
  updateMenu,
} from "./menu.service"
import type { MenuFilterValues, MenuFormValues, MenuRecord, PaginationMeta } from "./menu.types"
import { fetchModuleEntries } from "../module-entry/module-entry.service"
import type { ModuleEntryRecord } from "../module-entry/module-entry.types"

type MenuEditorMode = "create" | "edit"

const DEFAULT_FILTERS: MenuFilterValues = {
  menuName: "",
  isActive: "all",
}

const DEFAULT_FORM_VALUES: MenuFormValues = {
  menuName: "",
  moduleId: "",
  description: "",
  displayOrder: 0,
  isActive: true,
}

type MenuModuleOption = {
  label: string
  value: string
  moduleKey: string
  isActive: boolean
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
            to the deleted state. You can restore it from the deleted menus card before removing it permanently.
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
  menu,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: "restore" | "permanent"
  menu: MenuRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore menu" : "Delete menu permanently"
  const description =
    action === "restore"
      ? "Bring this menu back into the active application list."
      : "This will permanently remove the menu and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {menu?.menuName || "this menu"}
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

export function MenuWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [loadingDeletedMenus, setLoadingDeletedMenus] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [menus, setMenus] = useState<MenuRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedMenus, setDeletedMenus] = useState<MenuRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [moduleEntries, setModuleEntries] = useState<ModuleEntryRecord[]>([])
  const [loadingModuleEntries, setLoadingModuleEntries] = useState(true)
  const [moduleEntriesError, setModuleEntriesError] = useState("")

  const [draftFilters, setDraftFilters] = useState<MenuFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<MenuFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<MenuFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<MenuFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<MenuEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<MenuFormValues>(DEFAULT_FORM_VALUES)
  const [editingMenu, setEditingMenu] = useState<MenuRecord | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<MenuRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedMenu, setRecentlyDeletedMenu] = useState<MenuRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<MenuRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<"restore" | "permanent" | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const handleAuthFailure = useCallback(
    (message: string) => {
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
    },
    [router],
  )

  const activeCount = useMemo(() => menus.filter((menu) => menu.isActive).length, [menus])
  const inactiveCount = useMemo(() => menus.filter((menu) => !menu.isActive).length, [menus])
  const activeTotal = meta?.total ?? menus.length
  const deletedTotal = deletedMeta?.total ?? deletedMenus.length

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadMenus() {
      setLoadingMenus(true)
      setError("")

      try {
        const accessToken = window.localStorage.getItem("access_token")

        if (!accessToken) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        const response = await fetchMenus({
          apiUrl,
          accessToken,
          filters: activeFilters,
          page,
          limit,
        })

        if (!active) {
          return
        }

        setMenus(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error ? caughtError.message : "Unable to load menu entries right now."

        if (!handleAuthFailure(message)) {
          setError(message)
          toast.error(message)
        }
      } finally {
        if (active) {
          setLoadingMenus(false)
        }
      }
    }

    void loadMenus()

    return () => {
      active = false
    }
  }, [activeFilters, apiUrl, handleAuthFailure, limit, page, refreshVersion, router])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadDeletedMenus() {
      setLoadingDeletedMenus(true)
      setDeletedError("")

      try {
        const accessToken = window.localStorage.getItem("access_token")

        if (!accessToken) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        const response = await fetchMenus({
          apiUrl,
          accessToken,
          filters: deletedActiveFilters,
          page: deletedPage,
          limit: deletedLimit,
          deletedOnly: true,
        })

        if (!active) {
          return
        }

        setDeletedMenus(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load deleted menus right now."

        if (!handleAuthFailure(message)) {
          setDeletedError(message)
          toast.error(message)
        }
      } finally {
        if (active) {
          setLoadingDeletedMenus(false)
        }
      }
    }

    void loadDeletedMenus()

    return () => {
      active = false
    }
  }, [apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, refreshVersion, router])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadModuleEntries() {
      setLoadingModuleEntries(true)
      setModuleEntriesError("")

      try {
        const accessToken = window.localStorage.getItem("access_token")

        if (!accessToken) {
          window.localStorage.removeItem("access_token")
          window.localStorage.removeItem("refresh_token")
          window.localStorage.removeItem("auth_user")
          router.replace("/sign-in")
          return
        }

        const response = await fetchModuleEntries({
          apiUrl,
          accessToken,
          page: 1,
          limit: 100,
        })

        if (!active) {
          return
        }

        setModuleEntries(response.items)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load module options right now."

        if (!handleAuthFailure(message)) {
          setModuleEntriesError(message)
          toast.error(message)
        }
      } finally {
        if (active) {
          setLoadingModuleEntries(false)
        }
      }
    }

    void loadModuleEntries()

    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, router])

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setActiveFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function resetDeletedFilters() {
    setDeletedDraftFilters(DEFAULT_FILTERS)
    setDeletedActiveFilters(DEFAULT_FILTERS)
    setDeletedPage(1)
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
    if (menu.moduleEntry) {
      setModuleEntries((currentModuleEntries) => {
        if (currentModuleEntries.some((entry) => entry.id === menu.moduleEntry?.id)) {
          return currentModuleEntries
        }

        return [menu.moduleEntry as ModuleEntryRecord, ...currentModuleEntries]
      })
    }
    setEditorInitialValues({
      menuName: menu.menuName,
      moduleId: menu.moduleId,
      description: menu.description || "",
      displayOrder: menu.displayOrder,
      isActive: menu.isActive,
    })
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  function openPendingActionDialog(menu: MenuRecord, mode: "restore" | "permanent") {
    setPendingActionTarget(menu)
    setPendingActionMode(mode)
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

      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
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

      setRecentlyDeletedMenu(deleteTarget)
      setDeleteTarget(null)
      toast.success("Menu moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to delete the menu right now."

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
      const accessToken = window.localStorage.getItem("access_token")

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.")
      }

      if (pendingActionMode === "restore") {
        await restoreMenu({
          apiUrl,
          accessToken,
          id: pendingActionTarget.id,
        })
        toast.success("Menu restored successfully.")
      } else {
        await permanentlyDeleteMenu({
          apiUrl,
          accessToken,
          id: pendingActionTarget.id,
        })
        toast.success("Menu deleted permanently.")
      }

      if (recentlyDeletedMenu?.id === pendingActionTarget.id) {
        setRecentlyDeletedMenu(null)
      }

      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to complete the menu action right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setPendingActionWorking(false)
    }
  }

  const loadingInitial =
    loadingMenus &&
    menus.length === 0 &&
    loadingDeletedMenus &&
    deletedMenus.length === 0 &&
    loadingModuleEntries &&
    moduleEntries.length === 0 &&
    !error &&
    !deletedError &&
    !moduleEntriesError

  const moduleOptions: MenuModuleOption[] = useMemo(
    () =>
      moduleEntries.map((moduleEntry) => ({
        label: moduleEntry.moduleName,
        value: moduleEntry.id,
        moduleKey: moduleEntry.moduleKey,
        isActive: moduleEntry.isActive,
      })),
    [moduleEntries],
  )

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
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
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
                      Total {activeTotal}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Inactive {inactiveCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Deleted {deletedTotal}
                    </Badge>
                    {recentlyDeletedMenu ? (
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
                    New menu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedMenu ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted menu
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {recentlyDeletedMenu.menuName} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                      onClick={() => openPendingActionDialog(recentlyDeletedMenu, "restore")}
                    >
                      <Undo2 className="size-3.5" />
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => openPendingActionDialog(recentlyDeletedMenu, "permanent")}
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

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

          <DeletedMenusCard
            deletedMenus={deletedMenus}
            deletedMeta={deletedMeta}
            deletedPage={deletedPage}
            deletedLimit={deletedLimit}
            loadingDeletedMenus={loadingDeletedMenus}
            deletedError={deletedError}
            deletedDraftFilters={deletedDraftFilters}
            deletedActiveFilters={deletedActiveFilters}
            onDeletedDraftFiltersChange={setDeletedDraftFilters}
            onDeletedActiveFiltersChange={setDeletedActiveFilters}
            onDeletedPageChange={setDeletedPage}
            onDeletedLimitChange={setDeletedLimit}
            onOpenAction={openPendingActionDialog}
            onRetry={() => {
              resetDeletedFilters()
              triggerRefresh()
            }}
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
        moduleOptions={moduleOptions}
        moduleLoading={loadingModuleEntries}
        moduleError={moduleEntriesError}
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

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        menu={pendingActionTarget}
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
