"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Banknote, Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { CurrencyFormDialog } from "./component/currency-form-dialog"
import { CurrencyTableSection } from "./component/currency-table-section"
import { DeletedCurrenciesCard } from "./component/deleted-currencies-card"
import { createCurrency, downloadCurrencyUploadTemplate, fetchCurrencies, fetchCurrency, permanentlyDeleteCurrency, restoreCurrency, softDeleteCurrency, updateCurrency, uploadCurrencyTemplate } from "./currency.service"
import type { CurrencyFilterValues, CurrencyFormValues, CurrencyRecord, PaginationMeta } from "./currency.types"

type CurrencyEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type CurrencyAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const CURRENCY_MENU_NAME = "Currency Setup"
const EMPTY_ACCESS_RULES: CurrencyAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: CurrencyFilterValues = { currencyName: "", currencyCode: "", symbol: "" }
const DEFAULT_FORM_VALUES: CurrencyFormValues = {
  currencyName: "",
  currencyCode: "",
  rate: "",
  symbol: "",
  isDefault: false,
  isActive: true,
}

function getCurrencyLabel(currency: CurrencyRecord) {
  return `${currency.currencyName} (${currency.currencyCode})`
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Banknote className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">{actionLabel}</Button>
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

function DeleteConfirmDialog({ open, currency, working, onOpenChange, onConfirm }: { open: boolean; currency: CurrencyRecord | null; working: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete currency</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium text-slate-900 dark:text-slate-100">{currency ? getCurrencyLabel(currency) : "this currency"}</span>.
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

function RecentlyDeletedDialog({ open, action, currency, working, onOpenChange, onConfirm }: { open: boolean; action: PendingDeleteMode; currency: CurrencyRecord | null; working: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  const title = action === "restore" ? "Restore currency" : "Delete currency permanently"
  const description = action === "restore" ? "Bring this currency back into the active app configuration list." : "This will permanently remove the currency record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} <span className="font-medium text-slate-900 dark:text-slate-100">{currency ? getCurrencyLabel(currency) : "this currency"}</span>.
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

export function CurrencyWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingCurrencies, setLoadingCurrencies] = useState(true)
  const [loadingDeletedCurrencies, setLoadingDeletedCurrencies] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => {
    if (typeof window === "undefined") return ""
    return readSelectedOrganizationId()
  })
  const [accessRules, setAccessRules] = useState<CurrencyAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedCurrencies, setDeletedCurrencies] = useState<CurrencyRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<CurrencyFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<CurrencyFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<CurrencyFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<CurrencyFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<CurrencyEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<CurrencyFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CurrencyRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedCurrency, setRecentlyDeletedCurrency] = useState<CurrencyRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<CurrencyRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const handleAuthFailure = useCallback((message: string) => {
    if (!normalizeAuthFailure(message)) return false
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
    }
    router.replace("/sign-in")
    return true
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") return
    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }
    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
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
          menuName: CURRENCY_MENU_NAME,
        })
        if (!active) return
        setAccessRules({
          canView: permission.canView,
          canCreate: permission.canCreate,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
        })
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load your currency menu access right now."
        if (handleAuthFailure(message)) return
        setAccessRules(EMPTY_ACCESS_RULES)
        setAccessError(message)
      } finally {
        if (active) setLoadingAccessRules(false)
      }
    }
    void loadAccessRules()
    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  const openEditDialog = useCallback(async (currencyId: number) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update currencies.")
      return
    }
    setEditorMode("edit")
    setEditingId(currencyId)
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
      const record = await fetchCurrency({ apiUrl, accessToken: token, id: currencyId, organizationId: selectedOrganizationId || undefined })
      setEditorInitialValues({
        currencyName: record.currencyName ?? "",
        currencyCode: record.currencyCode ?? "",
        rate: record.rate !== null && record.rate !== undefined ? String(record.rate) : "",
        symbol: record.symbol ?? "",
        isDefault: Boolean(record.isDefault),
        isActive: record.isActive !== false,
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the currency record right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const openPendingActionDialog = useCallback((currency: CurrencyRecord, mode: PendingDeleteMode) => {
    if (mode === "restore" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to restore currencies.")
      return
    }
    if (mode === "permanent" && !accessRules?.canDelete) {
      toast.error("You do not have permission to permanently delete currencies.")
      return
    }
    setPendingActionTarget(currency)
    setPendingActionMode(mode)
  }, [accessRules?.canDelete, accessRules?.canUpdate])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true
    async function loadCurrencies() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setCurrencies([])
        setMeta(null)
        setLoadingCurrencies(false)
        return
      }
      setLoadingCurrencies(true)
      setError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchCurrencies({ apiUrl, accessToken: token, page, limit, filters: activeFilters, organizationId: selectedOrganizationId || undefined })
        if (!active) return
        setCurrencies(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load currencies right now."
        if (handleAuthFailure(message)) return
        setError(message)
      } finally {
        if (active) setLoadingCurrencies(false)
      }
    }
    void loadCurrencies()
    return () => {
      active = false
    }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true
    async function loadDeletedCurrencies() {
      if (loadingAccessRules) return
      if (!accessRules?.canView || !accessRules.canDelete) {
        setDeletedCurrencies([])
        setDeletedMeta(null)
        setLoadingDeletedCurrencies(false)
        return
      }
      setLoadingDeletedCurrencies(true)
      setDeletedError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchCurrencies({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        })
        if (!active) return
        setDeletedCurrencies(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted currencies right now."
        if (handleAuthFailure(message)) return
        setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedCurrencies(false)
      }
    }
    void loadDeletedCurrencies()
    return () => {
      active = false
    }
  }, [accessRules?.canDelete, accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const activeCount = useMemo(() => currencies.filter((currency) => currency.isActive !== false && !currency.deleted_at).length, [currencies])

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  function resetActiveFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setActiveFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function openCreateDialog() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create currencies.")
      return
    }
    setEditorMode("create")
    setEditingId(null)
    setEditorError("")
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  async function downloadTemplate() {
    if (!accessRules?.canCreate || downloadingTemplate) {
      if (!accessRules?.canCreate) {
        toast.error("You do not have permission to download the currency template.")
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

      const blob = await downloadCurrencyUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "currency-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to download the currency template right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file || uploadingTemplate) return

    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to upload currencies.")
      return
    }

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadCurrencyTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })
      toast.success(`Currency upload completed. ${result.inserted} inserted, ${result.skipped} already existed.`)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to upload the currency template right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setUploadingTemplate(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
  }

  function requestSoftDelete(currency: CurrencyRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete currencies.")
      return
    }
    setDeleteTarget(currency)
  }

  async function submitEditor(values: CurrencyFormValues) {
    if (editorSubmitting || editorLoading) return
    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create currencies.")
      return
    }
    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update currencies.")
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
        await createCurrency({ apiUrl, accessToken: token, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Currency created successfully.")
      } else if (editingId !== null) {
        await updateCurrency({ apiUrl, accessToken: token, id: editingId, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Currency updated successfully.")
      }
      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the currency right now."
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
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete currencies.")
      return
    }
    setDeleteWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      await softDeleteCurrency({ apiUrl, accessToken: token, id: deleteTarget.id, organizationId: selectedOrganizationId || undefined })
      setRecentlyDeletedCurrency(deleteTarget)
      setDeleteTarget(null)
      toast.success("Currency moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the currency right now."
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
          toast.error("You do not have permission to restore currencies.")
          return
        }
        await restoreCurrency({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Currency restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete currencies.")
          return
        }
        await permanentlyDeleteCurrency({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Currency deleted permanently.")
      }
      if (recentlyDeletedCurrency?.id === pendingActionTarget.id) setRecentlyDeletedCurrency(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedCurrencies.length
  const activeTotal = meta?.total ?? currencies.length

  if ((loadingAccessRules || loadingCurrencies) && currencies.length === 0 && (loadingAccessRules || loadingDeletedCurrencies) && deletedCurrencies.length === 0 && !error && !deletedError && !accessError) {
    return <WorkspaceSkeleton />
  }

  if (!loadingAccessRules && accessRules && !accessRules.canView) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">App Config</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Currencies</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage currency reference data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <EmptyState title="Currency access unavailable" description={accessError || "You do not have permission to view the Currencies menu for the selected organization."} actionLabel="Retry" onAction={triggerRefresh} />
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
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">App Config</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Currencies</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage currency reference data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <EmptyState title="Unable to load currencies" description={error} actionLabel="Try again" onAction={triggerRefresh} />
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
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">App configuration reference data</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Currencies</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain currency records for the selected organization.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedCurrency ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Refresh</Button>
                  {accessRules?.canCreate ? <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" />New currency</Button> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedCurrency ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted currency</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">{getCurrencyLabel(recentlyDeletedCurrency)} was soft deleted and can still be restored.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? <Button type="button" variant="outline" className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50" onClick={() => openPendingActionDialog(recentlyDeletedCurrency, "restore")}><Undo2 className="size-3.5" />Restore</Button> : null}
                    {accessRules?.canDelete ? <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedCurrency, "permanent")}><Trash2 className="size-3.5" />Delete permanently</Button> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <CurrencyTableSection
            currencies={currencies}
            meta={meta}
            page={page}
            limit={limit}
            loadingCurrencies={loadingCurrencies}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateCurrency={openCreateDialog}
            onEditCurrency={openEditDialog}
            onDeleteCurrency={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            canCreateCurrency={Boolean(accessRules?.canCreate)}
            canUpdateCurrency={Boolean(accessRules?.canUpdate)}
            canDeleteCurrency={Boolean(accessRules?.canDelete)}
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

          {accessRules?.canDelete ? (
            <DeletedCurrenciesCard
              deletedCurrencies={deletedCurrencies}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedCurrencies={loadingDeletedCurrencies}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreCurrency={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteCurrency={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <CurrencyFormDialog
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

      <DeleteConfirmDialog open={Boolean(deleteTarget)} currency={deleteTarget} working={deleteWorking} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} onConfirm={confirmSoftDelete} />
      <RecentlyDeletedDialog open={Boolean(pendingActionTarget && pendingActionMode)} action={pendingActionMode ?? "restore"} currency={pendingActionTarget} working={pendingActionWorking} onOpenChange={(open) => { if (!open) { setPendingActionTarget(null); setPendingActionMode(null) } }} onConfirm={confirmPendingAction} />
    </div>
  )
}
