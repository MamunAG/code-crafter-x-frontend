"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Flag, Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
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

import { CountryFormDialog } from "./component/country-form-dialog"
import { CountryTableSection } from "./component/country-table-section"
import { DeletedCountriesCard } from "./component/deleted-countries-card"
import {
  createCountry,
  downloadCountryUploadTemplate,
  fetchCountries,
  fetchCountry,
  permanentlyDeleteCountry,
  restoreCountry,
  softDeleteCountry,
  updateCountry,
  uploadCountryTemplate,
} from "./country.service"
import type { CountryFilterValues, CountryFormValues, CountryRecord, PaginationMeta } from "./country.types"

type CountryEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type CountryAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const COUNTRY_MENU_NAME = "Country Setup"
const EMPTY_ACCESS_RULES: CountryAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: CountryFilterValues = { name: "" }
const DEFAULT_FORM_VALUES: CountryFormValues = { name: "", isActive: true }

function getCountryLabel(country: CountryRecord) {
  return country.name
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <Flag className="size-5" />
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

function DeleteConfirmDialog({ open, country, working, onOpenChange, onConfirm }: { open: boolean; country: CountryRecord | null; working: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete country</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium text-slate-900 dark:text-slate-100">{country ? getCountryLabel(country) : "this country"}</span>.
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

function RecentlyDeletedDialog({ open, action, country, working, onOpenChange, onConfirm }: { open: boolean; action: PendingDeleteMode; country: CountryRecord | null; working: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  const title = action === "restore" ? "Restore country" : "Delete country permanently"
  const description = action === "restore" ? "Bring this country back into the active app configuration list." : "This will permanently remove the country record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} <span className="font-medium text-slate-900 dark:text-slate-100">{country ? getCountryLabel(country) : "this country"}</span>.
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

export function CountryWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingDeletedCountries, setLoadingDeletedCountries] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => {
    if (typeof window === "undefined") return ""
    return readSelectedOrganizationId()
  })
  const [accessRules, setAccessRules] = useState<CountryAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [countries, setCountries] = useState<CountryRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedCountries, setDeletedCountries] = useState<CountryRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<CountryFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<CountryFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<CountryFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<CountryFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<CountryEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<CountryFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CountryRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedCountry, setRecentlyDeletedCountry] = useState<CountryRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<CountryRecord | null>(null)
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
          menuName: COUNTRY_MENU_NAME,
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
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load your country menu access right now."
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

  const openEditDialog = useCallback(async (countryId: number) => {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update countries.")
      return
    }
    setEditorMode("edit")
    setEditingId(countryId)
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
      const record = await fetchCountry({ apiUrl, accessToken: token, id: countryId, organizationId: selectedOrganizationId || undefined })
      setEditorInitialValues({ name: record.name ?? "", isActive: record.isActive !== false })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the country record right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorLoading(false)
    }
  }, [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const openPendingActionDialog = useCallback((country: CountryRecord, mode: PendingDeleteMode) => {
    if (mode === "restore" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to restore countries.")
      return
    }
    if (mode === "permanent" && !accessRules?.canDelete) {
      toast.error("You do not have permission to permanently delete countries.")
      return
    }
    setPendingActionTarget(country)
    setPendingActionMode(mode)
  }, [accessRules?.canDelete, accessRules?.canUpdate])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true
    async function loadCountries() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setCountries([])
        setMeta(null)
        setLoadingCountries(false)
        return
      }
      setLoadingCountries(true)
      setError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchCountries({ apiUrl, accessToken: token, page, limit, filters: activeFilters, organizationId: selectedOrganizationId || undefined })
        if (!active) return
        setCountries(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load countries right now."
        if (handleAuthFailure(message)) return
        setError(message)
      } finally {
        if (active) setLoadingCountries(false)
      }
    }
    void loadCountries()
    return () => {
      active = false
    }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") return
    let active = true
    async function loadDeletedCountries() {
      if (loadingAccessRules) return
      if (!accessRules?.canView || !accessRules.canDelete) {
        setDeletedCountries([])
        setDeletedMeta(null)
        setLoadingDeletedCountries(false)
        return
      }
      setLoadingDeletedCountries(true)
      setDeletedError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchCountries({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        })
        if (!active) return
        setDeletedCountries(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) return
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted countries right now."
        if (handleAuthFailure(message)) return
        setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedCountries(false)
      }
    }
    void loadDeletedCountries()
    return () => {
      active = false
    }
  }, [accessRules?.canDelete, accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const activeCount = useMemo(() => countries.filter((country) => country.isActive !== false && !country.deleted_at).length, [countries])

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
      toast.error("You do not have permission to create countries.")
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
        toast.error("You do not have permission to download the country template.")
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

      const blob = await downloadCountryUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "country-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to download the country template right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file || uploadingTemplate) return

    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to upload countries.")
      return
    }

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadCountryTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })
      toast.success(`Country upload completed. ${result.inserted} inserted, ${result.skipped} already existed.`)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to upload the country template right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setUploadingTemplate(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
  }

  function requestSoftDelete(country: CountryRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete countries.")
      return
    }
    setDeleteTarget(country)
  }

  async function submitEditor(values: CountryFormValues) {
    if (editorSubmitting || editorLoading) return
    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create countries.")
      return
    }
    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update countries.")
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
        await createCountry({ apiUrl, accessToken: token, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Country created successfully.")
      } else if (editingId !== null) {
        await updateCountry({ apiUrl, accessToken: token, id: editingId, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Country updated successfully.")
      }
      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the country right now."
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
      toast.error("You do not have permission to delete countries.")
      return
    }
    setDeleteWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      await softDeleteCountry({ apiUrl, accessToken: token, id: deleteTarget.id, organizationId: selectedOrganizationId || undefined })
      setRecentlyDeletedCountry(deleteTarget)
      setDeleteTarget(null)
      toast.success("Country moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete the country right now."
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
          toast.error("You do not have permission to restore countries.")
          return
        }
        await restoreCountry({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Country restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete countries.")
          return
        }
        await permanentlyDeleteCountry({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Country deleted permanently.")
      }
      if (recentlyDeletedCountry?.id === pendingActionTarget.id) setRecentlyDeletedCountry(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedCountries.length
  const activeTotal = meta?.total ?? countries.length

  if ((loadingAccessRules || loadingCountries) && countries.length === 0 && (loadingAccessRules || loadingDeletedCountries) && deletedCountries.length === 0 && !error && !deletedError && !accessError) {
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Countries</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage country reference data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <EmptyState title="Country access unavailable" description={accessError || "You do not have permission to view the Countries menu for the selected organization."} actionLabel="Retry" onAction={triggerRefresh} />
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Countries</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage country reference data.</p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Retry</Button>
            </div>
          </CardContent>
        </Card>
        <EmptyState title="Unable to load countries" description={error} actionLabel="Try again" onAction={triggerRefresh} />
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
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Countries</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain country records across the platform.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedCountry ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" />Refresh</Button>
                  {accessRules?.canCreate ? (
                    <>
                      <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" />New country</Button>
                    </>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedCountry ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Recently deleted country</p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">{getCountryLabel(recentlyDeletedCountry)} was soft deleted and can still be restored.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? <Button type="button" variant="outline" className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50" onClick={() => openPendingActionDialog(recentlyDeletedCountry, "restore")}><Undo2 className="size-3.5" />Restore</Button> : null}
                    {accessRules?.canDelete ? <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedCountry, "permanent")}><Trash2 className="size-3.5" />Delete permanently</Button> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <CountryTableSection
            countries={countries}
            meta={meta}
            page={page}
            limit={limit}
            loadingCountries={loadingCountries}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateCountry={openCreateDialog}
            onEditCountry={openEditDialog}
            onDeleteCountry={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            canCreateCountry={Boolean(accessRules?.canCreate)}
            canUpdateCountry={Boolean(accessRules?.canUpdate)}
            canDeleteCountry={Boolean(accessRules?.canDelete)}
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
            <DeletedCountriesCard
              deletedCountries={deletedCountries}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedCountries={loadingDeletedCountries}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreCountry={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteCountry={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <CountryFormDialog
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

      <DeleteConfirmDialog open={Boolean(deleteTarget)} country={deleteTarget} working={deleteWorking} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} onConfirm={confirmSoftDelete} />
      <RecentlyDeletedDialog open={Boolean(pendingActionTarget && pendingActionMode)} action={pendingActionMode ?? "restore"} country={pendingActionTarget} working={pendingActionWorking} onOpenChange={(open) => { if (!open) { setPendingActionTarget(null); setPendingActionMode(null) } }} onConfirm={confirmPendingAction} />
    </div>
  )
}
