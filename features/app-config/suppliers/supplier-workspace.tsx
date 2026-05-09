"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"

import { ActiveSuppliersSection } from "./component/active-suppliers-section"
import { DeletedSuppliersSection } from "./component/deleted-suppliers-section"
import { SupplierFormDialog } from "./component/supplier-form-dialog"
import {
  createSupplier,
  downloadSupplierUploadTemplate,
  fetchSupplier,
  fetchSuppliers,
  permanentlyDeleteSupplier,
  restoreSupplier,
  softDeleteSupplier,
  uploadSupplierTemplate,
  updateSupplier,
} from "./supplier.service"
import type {
  PaginationMeta,
  SupplierFilterValues,
  SupplierFormValues,
  SupplierRecord,
} from "./supplier.types"

type SupplierEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type SupplierAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const SUPPLIER_MENU_NAME = "Supplier Entry"
const EMPTY_ACCESS_RULES: SupplierAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: SupplierFilterValues = {
  name: "",
  displayName: "",
  code: "",
  contact: "",
  email: "",
  address: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: SupplierFormValues = {
  name: "",
  displayName: "",
  code: "",
  contact: "",
  email: "",
  address: "",
  remarks: "",
  isActive: true,
}

function getSupplierLabel(supplier: SupplierRecord) {
  return supplier.displayName?.trim() || supplier.name
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

function DeleteConfirmDialog({
  open,
  supplier,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  supplier: SupplierRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete supplier</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {supplier ? getSupplierLabel(supplier) : "this supplier"}
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
  supplier,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  supplier: SupplierRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title =
    action === "restore" ? "Restore supplier" : "Delete supplier permanently"
  const description =
    action === "restore"
      ? "Bring this supplier back into the active configuration list."
      : "This will permanently remove the supplier record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {supplier ? getSupplierLabel(supplier) : "this supplier"}
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

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-3">
                <div className="h-4 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-10 w-72 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full max-w-2xl rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-5 w-40 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-64 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-900" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-5 w-44 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-72 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-900" />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}

export function SupplierWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingDeletedSuppliers, setLoadingDeletedSuppliers] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId()
  )
  const [accessRules, setAccessRules] = useState<SupplierAccessRules | null>(
    null
  )
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedSuppliers, setDeletedSuppliers] = useState<SupplierRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [activeFilters, setActiveFilters] =
    useState<SupplierFilterValues>(DEFAULT_FILTERS)
  const [deletedFilters, setDeletedFilters] =
    useState<SupplierFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<SupplierEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] =
    useState<SupplierFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<SupplierRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedSupplier, setRecentlyDeletedSupplier] =
    useState<SupplierRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] =
    useState<SupplierRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] =
    useState<PendingDeleteMode | null>(null)
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
    [router]
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

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

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true)
    setLoadingDeletedSuppliers(true)
    setError("")
    setDeletedError("")

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const [activeResponse, deletedResponse] = await Promise.all([
        fetchSuppliers({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters: activeFilters,
          organizationId: selectedOrganizationId || undefined,
        }),
        fetchSuppliers({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        }),
      ])

      setSuppliers(activeResponse.items)
      setMeta(activeResponse.meta)
      setDeletedSuppliers(deletedResponse.items)
      setDeletedMeta(deletedResponse.meta)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load supplier data right now."

      if (!handleAuthFailure(message)) {
        setError(message)
        setDeletedError(message)
        toast.error(message)
      }
    } finally {
      setLoadingSuppliers(false)
      setLoadingDeletedSuppliers(false)
    }
  }, [
    activeFilters,
    apiUrl,
    deletedFilters,
    deletedLimit,
    deletedPage,
    handleAuthFailure,
    limit,
    page,
    selectedOrganizationId,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    void loadSuppliers()
  }, [loadSuppliers, refreshVersion])

  useEffect(() => {
    let active = true

    async function loadAccessRules() {
      setLoadingAccessRules(true)
      setAccessError("")

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token || !selectedOrganizationId) {
          if (active) {
            setAccessRules(EMPTY_ACCESS_RULES)
          }
          return
        }

        const permission = await fetchCurrentMenuPermission({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId,
          menuName: SUPPLIER_MENU_NAME,
        })

        if (active) {
          setAccessRules({
            canView: Boolean(permission.canView),
            canCreate: Boolean(permission.canCreate),
            canUpdate: Boolean(permission.canUpdate),
            canDelete: Boolean(permission.canDelete),
          })
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load supplier permissions right now."

        if (active) {
          setAccessRules(EMPTY_ACCESS_RULES)
          setAccessError(message)
        }
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
  }, [apiUrl, selectedOrganizationId])

  async function openCreateDialog() {
    setEditorMode("create")
    setEditorError("")
    setEditingId(null)
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorOpen(true)
  }

  async function downloadTemplate() {
    if (!accessRules?.canCreate || downloadingTemplate) {
      if (!accessRules?.canCreate) {
        toast.error("You do not have permission to download the supplier template.")
      }
      return
    }

    setDownloadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const blob = await downloadSupplierUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "supplier-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to download the supplier template right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file || uploadingTemplate) {
      return
    }

    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to upload suppliers.")
      return
    }

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadSupplierTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })
      toast.success(
        `Supplier upload completed. ${result.inserted} inserted, ${result.skipped} already existed.`
      )
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload the supplier template right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setUploadingTemplate(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
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

        const supplier = await fetchSupplier({
          apiUrl,
          accessToken: token,
          id,
          organizationId: selectedOrganizationId || undefined,
        })

        setEditorInitialValues({
          name: supplier.name ?? "",
          displayName: supplier.displayName ?? "",
          code: supplier.code ?? "",
          contact: supplier.contact ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          remarks: supplier.remarks ?? "",
          isActive: supplier.isActive !== false,
        })
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the selected supplier."

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
    async (values: SupplierFormValues) => {
      if (!values.name.trim()) {
        setEditorError("Supplier name is required.")
        return
      }

      if (!values.displayName.trim()) {
        setEditorError("Supplier display name is required.")
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
          await createSupplier({
            apiUrl,
            accessToken: token,
            payload: values,
            organizationId: selectedOrganizationId || undefined,
          })
          toast.success("Supplier created successfully.")
        } else if (editingId != null) {
          await updateSupplier({
            apiUrl,
            accessToken: token,
            id: editingId,
            payload: values,
            organizationId: selectedOrganizationId || undefined,
          })
          toast.success("Supplier updated successfully.")
        }

        setEditorOpen(false)
        setEditorInitialValues(DEFAULT_FORM_VALUES)
        setEditingId(null)
        triggerRefresh()
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to save the supplier right now."

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

  function requestSoftDelete(supplier: SupplierRecord) {
    setDeleteTarget(supplier)
  }

  async function confirmSoftDelete() {
    if (!deleteTarget || deleteWorking) {
      return
    }

    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete suppliers.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteSupplier({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })

      setRecentlyDeletedSupplier(deleteTarget)
      setDeleteTarget(null)
      toast.success("Supplier moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the supplier right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setDeleteWorking(false)
    }
  }

  function openPendingActionDialog(
    supplier: SupplierRecord,
    action: PendingDeleteMode
  ) {
    setPendingActionTarget(supplier)
    setPendingActionMode(action)
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
          toast.error("You do not have permission to restore suppliers.")
          return
        }

        await restoreSupplier({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Supplier restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error(
            "You do not have permission to permanently delete suppliers."
          )
          return
        }

        await permanentlyDeleteSupplier({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Supplier deleted permanently.")
      }

      if (recentlyDeletedSupplier?.id === pendingActionTarget.id) {
        setRecentlyDeletedSupplier(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedSuppliers.length
  const activeTotal = meta?.total ?? suppliers.length
  const activeCount = useMemo(
    () => suppliers.filter((supplier) => supplier.deleted_at == null).length,
    [suppliers]
  )

  if (
    loadingAccessRules &&
    loadingSuppliers &&
    suppliers.length === 0 &&
    loadingDeletedSuppliers &&
    deletedSuppliers.length === 0 &&
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
                <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                  App configuration
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Supplier Entry
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage supplier master data.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={triggerRefresh}
                className="rounded-xl"
              >
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>

        <EmptyState
          title="Supplier access unavailable"
          description={
            accessError ||
            "You do not have permission to view the Supplier Entry menu for the selected organization."
          }
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
                <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                  App configuration
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Supplier Entry
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage supplier master data.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={triggerRefresh}
                className="rounded-xl"
              >
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>

        <EmptyState
          title="Unable to load suppliers"
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
                  <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                    App configuration
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                    Supplier Entry
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain supplier records for the
                    selected organization.
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
                    {recentlyDeletedSupplier ? (
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
                      New supplier
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedSupplier ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted supplier
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getSupplierLabel(recentlyDeletedSupplier)} was soft
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
                            recentlyDeletedSupplier,
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
                            recentlyDeletedSupplier,
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

          <ActiveSuppliersSection
            data={suppliers}
            meta={meta}
            page={page}
            limit={limit}
            loading={loadingSuppliers}
            filters={activeFilters}
            onFilterChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreate={openCreateDialog}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            onEdit={openEditDialog}
            onDelete={requestSoftDelete}
            canCreate={Boolean(accessRules?.canCreate)}
            canUpdate={Boolean(accessRules?.canUpdate)}
            canDelete={Boolean(accessRules?.canDelete)}
            downloadingTemplate={downloadingTemplate}
            uploadingTemplate={uploadingTemplate}
          />

          <DeletedSuppliersSection
            data={deletedSuppliers}
            meta={deletedMeta}
            page={deletedPage}
            limit={deletedLimit}
            loading={loadingDeletedSuppliers}
            error={deletedError}
            filters={deletedFilters}
            onFilterChange={setDeletedFilters}
            onPageChange={setDeletedPage}
            onLimitChange={setDeletedLimit}
            onOpenAction={openPendingActionDialog}
            canRestore={Boolean(accessRules?.canUpdate)}
            canPermanentlyDelete={Boolean(accessRules?.canDelete)}
          />
        </div>
      </ScrollArea>

      <SupplierFormDialog
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

      <input
        ref={uploadInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => void uploadTemplate(event.target.files?.[0])}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        supplier={deleteTarget}
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
        supplier={pendingActionTarget}
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
