"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import type { AppComboboxLoadParams, AppComboboxOption } from "@/components/app-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchFactories } from "@/features/app-config/factory/factory.service"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { fetchBuyers } from "@/features/merchandising/buyers/buyer.service"
import { fetchColors } from "@/features/merchandising/colors/color.service"
import { fetchSizes } from "@/features/merchandising/sizes/size.service"
import { fetchStyles } from "@/features/merchandising/styles/style.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveJobsSection } from "./component/active-jobs-section"
import { DeletedJobsSection } from "./component/deleted-jobs-section"
import { JobFormDialog } from "./component/job-form-dialog"
import {
  createJob,
  fetchJob,
  fetchJobs,
  permanentlyDeleteJob,
  restoreJob,
  softDeleteJob,
  updateJob,
} from "./job.service"
import type { JobDetailFormValues, JobDetailRecord, JobFilterValues, JobFormError, JobFormValues, JobRecord, PaginationMeta } from "./job.types"

type JobEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type JobAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const MENU_NAME = "Purchase Order"
const EMPTY_ACCESS_RULES: JobAccessRules = { canView: false, canCreate: false, canUpdate: false, canDelete: false }

const DEFAULT_FILTERS: JobFilterValues = {
  factoryId: "",
  buyerId: "",
  merchandiserId: "",
  ordertype: "",
  pono: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: JobFormValues = {
  factoryId: "",
  buyerId: "",
  merchandiserId: "",
  ordertype: "",
  totalPoQty: "0",
  poReceiveDate: "",
  isActive: true,
  jobDetails: [],
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function getJobLabel(job?: JobRecord | null) {
  const po = job?.jobDetails?.[0]?.purchaseOrder?.pono
  return po?.trim() || "this purchase order"
}

function detailToFormValue(detail: JobDetailRecord): JobDetailFormValues {
  return {
    id: detail.id || crypto.randomUUID(),
    pono: detail.purchaseOrder?.pono ?? "",
    styleId: detail.styleId ?? "",
    styleLabel: detail.style?.styleNo?.trim() || detail.style?.styleName?.trim() || "",
    sizeId: detail.sizeId == null ? "" : String(detail.sizeId),
    sizeLabel: detail.size?.sizeName ?? "",
    colorId: detail.colorId == null ? "" : String(detail.colorId),
    colorLabel: detail.color?.colorDisplayName?.trim() || detail.color?.colorName?.trim() || "",
    quantity: String(detail.quantity ?? 0),
    fob: String(detail.fob ?? 0),
    cm: String(detail.cm ?? 0),
    deliveryDate: detail.deliveryDate ? String(detail.deliveryDate).slice(0, 10) : "",
    remarks: detail.remarks ?? "",
  }
}

function normalizeJobFormErrors(values: JobFormValues): JobFormError[] {
  const errors: JobFormError[] = []
  if (!values.factoryId.trim()) errors.push({ section: "basic-info", message: "Factory is required." })
  if (!values.buyerId.trim()) errors.push({ section: "basic-info", message: "Buyer is required." })
  if (values.jobDetails.length === 0) errors.push({ section: "details", message: "At least one PO detail row is required." })
  values.jobDetails.forEach((detail, index) => {
    if (!detail.pono.trim()) errors.push({ section: "details", message: `Row ${index + 1}: PO number is required.` })
    if (!detail.styleId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: Style is required.` })
    if (!detail.sizeId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: Size is required.` })
    if (!detail.colorId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: Color is required.` })
  })
  return errors
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  job,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  job: JobRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete purchase order</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium">{getJobLabel(job)}</span>. You can restore it before removing it permanently.
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
  job,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  job: JobRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore purchase order" : "Delete purchase order permanently"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {action === "restore" ? "Bring this purchase order back into the active list." : "This will permanently remove the purchase order and cannot be undone."}{" "}
            <span className="font-medium">{getJobLabel(job)}</span>.
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

export function JobWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => (typeof window === "undefined" ? "" : readSelectedOrganizationId()))
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [accessRules, setAccessRules] = useState<JobAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [deletedJobs, setDeletedJobs] = useState<JobRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingDeletedJobs, setLoadingDeletedJobs] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [draftFilters, setDraftFilters] = useState<JobFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<JobFilterValues>(DEFAULT_FILTERS)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<JobEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorErrors, setEditorErrors] = useState<JobFormError[]>([])
  const [editorValues, setEditorValues] = useState<JobFormValues>(DEFAULT_FORM_VALUES)
  const [selectedFactory, setSelectedFactory] = useState<AppComboboxOption | null>(null)
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedJob, setRecentlyDeletedJob] = useState<JobRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<JobRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
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
    [router],
  )

  const triggerRefresh = useCallback(() => setRefreshVersion((current) => current + 1), [])

  useEffect(() => {
    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }
    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  useEffect(() => {
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
          menuName: MENU_NAME,
        })
        if (active) setAccessRules(permission)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load purchase order access right now."
        if (!handleAuthFailure(message) && active) {
          setAccessRules(EMPTY_ACCESS_RULES)
          setAccessError(message)
        }
      } finally {
        if (active) setLoadingAccessRules(false)
      }
    }
    void loadAccessRules()
    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    let active = true
    async function loadJobs() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setJobs([])
        setMeta(null)
        setLoadingJobs(false)
        return
      }
      setLoadingJobs(true)
      setError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchJobs({ apiUrl, accessToken: token, page, limit, filters: activeFilters, organizationId: selectedOrganizationId || undefined })
        if (active) {
          setJobs(response.items)
          setMeta(response.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load purchase orders right now."
        if (!handleAuthFailure(message) && active) setError(message)
      } finally {
        if (active) setLoadingJobs(false)
      }
    }
    void loadJobs()
    return () => {
      active = false
    }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    let active = true
    async function loadDeletedJobs() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setDeletedJobs([])
        setDeletedMeta(null)
        setLoadingDeletedJobs(false)
        return
      }
      setLoadingDeletedJobs(true)
      setDeletedError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchJobs({ apiUrl, accessToken: token, page: deletedPage, limit: deletedLimit, filters: {}, deletedOnly: true, organizationId: selectedOrganizationId || undefined })
        if (active) {
          setDeletedJobs(response.items)
          setDeletedMeta(response.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted purchase orders right now."
        if (!handleAuthFailure(message) && active) setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedJobs(false)
      }
    }
    void loadDeletedJobs()
    return () => {
      active = false
    }
  }, [accessRules?.canView, apiUrl, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  async function loadFactoryOptions({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) {
    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")
    const response = await fetchFactories({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { name: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
    return {
      items: response.items.map((factory) => ({ value: factory.id, label: factory.displayName?.trim() || factory.name })),
      hasNextPage: response.meta.hasNextPage,
    }
  }

  async function loadBuyerOptions({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) {
    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")
    const response = await fetchBuyers({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { name: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
    return {
      items: response.items.map((buyer) => ({ value: buyer.id, label: buyer.displayName?.trim() || buyer.name })),
      hasNextPage: response.meta.hasNextPage,
    }
  }

  async function loadStyleOptions({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) {
    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")
    const response = await fetchStyles({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { styleNo: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
    return {
      items: response.items.map((style) => ({ value: style.id, label: style.styleNo?.trim() || style.styleName?.trim() || style.id })),
      hasNextPage: response.meta.hasNextPage,
    }
  }

  async function loadSizeOptions({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) {
    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")
    const response = await fetchSizes({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { sizeName: query }, organizationId: selectedOrganizationId || undefined })
    return {
      items: response.items.filter((size) => size.deleted_at == null && size.isActive !== false).map((size) => ({ value: String(size.id), label: size.sizeName })),
      hasNextPage: response.meta.hasNextPage,
    }
  }

  async function loadColorOptions({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) {
    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")
    const response = await fetchColors({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { colorName: query }, organizationId: selectedOrganizationId || undefined })
    return {
      items: response.items.filter((color) => color.deleted_at == null && color.isActive !== false).map((color) => ({ value: String(color.id), label: color.colorDisplayName?.trim() || color.colorName })),
      hasNextPage: response.meta.hasNextPage,
    }
  }

  function openCreateDialog() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create purchase orders.")
      return
    }
    setEditorMode("create")
    setEditingId(null)
    setEditorValues(DEFAULT_FORM_VALUES)
    setSelectedFactory(null)
    setSelectedBuyer(null)
    setEditorErrors([])
    setEditorLoading(false)
    setEditorOpen(true)
  }

  async function openEditDialog(id: string) {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update purchase orders.")
      return
    }
    setEditorMode("edit")
    setEditingId(id)
    setEditorLoading(true)
    setEditorOpen(true)
    setEditorErrors([])
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      const record = await fetchJob({ apiUrl, accessToken: token, id, organizationId: selectedOrganizationId || undefined })
      setEditorValues({
        factoryId: record.factoryId ?? "",
        buyerId: record.buyerId ?? "",
        merchandiserId: record.merchandiserId == null ? "" : String(record.merchandiserId),
        ordertype: record.ordertype ?? "",
        totalPoQty: String(record.totalPoQty ?? 0),
        poReceiveDate: record.poReceiveDate ? String(record.poReceiveDate).slice(0, 10) : "",
        isActive: record.isActive !== false,
        jobDetails: (record.jobDetails ?? []).map(detailToFormValue),
      })
      setSelectedFactory({ value: record.factoryId, label: record.factory?.displayName?.trim() || record.factory?.name?.trim() || record.factoryId })
      setSelectedBuyer({ value: record.buyerId, label: record.buyer?.displayName?.trim() || record.buyer?.name?.trim() || record.buyerId })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load purchase order right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setEditorLoading(false)
    }
  }

  async function submitEditor(values: JobFormValues) {
    const nextValues = {
      ...values,
      totalPoQty: String(values.jobDetails.reduce((total, detail) => total + (Number(detail.quantity) || 0), 0)),
    }
    const validationErrors = normalizeJobFormErrors(nextValues)
    if (validationErrors.length) {
      setEditorErrors(validationErrors)
      toast.error("Please complete the required purchase order fields.")
      return
    }
    setEditorSubmitting(true)
    setEditorErrors([])
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      if (editorMode === "create") {
        await createJob({ apiUrl, accessToken: token, payload: nextValues, organizationId: selectedOrganizationId || undefined })
        toast.success("Purchase order created successfully.")
      } else if (editingId) {
        await updateJob({ apiUrl, accessToken: token, id: editingId, payload: nextValues, organizationId: selectedOrganizationId || undefined })
        toast.success("Purchase order updated successfully.")
      }
      setEditorOpen(false)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save purchase order right now."
      if (!handleAuthFailure(message)) {
        setEditorErrors([{ section: "basic-info", message }])
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  function requestSoftDelete(job: JobRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete purchase orders.")
      return
    }
    setDeleteTarget(job)
  }

  async function confirmSoftDelete() {
    if (!deleteTarget || deleteWorking) return
    setDeleteWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      await softDeleteJob({ apiUrl, accessToken: token, id: deleteTarget.id, organizationId: selectedOrganizationId || undefined })
      setRecentlyDeletedJob(deleteTarget)
      setDeleteTarget(null)
      toast.success("Purchase order moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete purchase order right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }

  function openPendingActionDialog(job: JobRecord, mode: PendingDeleteMode) {
    setPendingActionTarget(job)
    setPendingActionMode(mode)
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
        await restoreJob({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Purchase order restored successfully.")
      } else {
        await permanentlyDeleteJob({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Purchase order deleted permanently.")
      }
      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to complete delete action right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setPendingActionWorking(false)
    }
  }

  const activeTotal = meta?.total ?? jobs.length
  const deletedTotal = deletedMeta?.total ?? deletedJobs.length
  const activeCount = useMemo(() => jobs.filter((job) => job.isActive !== false && !job.deleted_at).length, [jobs])

  if ((loadingAccessRules || loadingJobs) && jobs.length === 0 && (loadingAccessRules || loadingDeletedJobs) && deletedJobs.length === 0 && !error && !deletedError && !accessError) {
    return <WorkspaceSkeleton />
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-4 sm:p-8 sm:py-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Merchandising orders</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Purchase Order</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain purchase order job records.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedJob ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" /> Refresh</Button>
                  {accessRules?.canCreate ? <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" /> New purchase order</Button> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {accessError && !accessRules?.canView ? (
            <Card><CardContent className="p-6 text-sm text-destructive">{accessError}</CardContent></Card>
          ) : null}

          {recentlyDeletedJob ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-900 dark:text-amber-100">{getJobLabel(recentlyDeletedJob)} was soft deleted and can still be restored.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedJob, "restore")}><Undo2 className="size-3.5" /> Restore</Button>
                  <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedJob, "permanent")}><Trash2 className="size-3.5" /> Delete permanently</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {error ? <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card> : null}

          <ActiveJobsSection
            jobs={jobs}
            meta={meta}
            page={page}
            limit={limit}
            loadingJobs={loadingJobs}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateJob={openCreateDialog}
            onEditJob={openEditDialog}
            onDeleteJob={requestSoftDelete}
            onResetFilters={() => {
              setDraftFilters(DEFAULT_FILTERS)
              setActiveFilters(DEFAULT_FILTERS)
              setPage(1)
            }}
            canCreateJob={Boolean(accessRules?.canCreate)}
            canUpdateJob={Boolean(accessRules?.canUpdate)}
            canDeleteJob={Boolean(accessRules?.canDelete)}
          />

          {accessRules?.canView ? (
            <DeletedJobsSection
              deletedJobs={deletedJobs}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedJobs={loadingDeletedJobs}
              deletedError={deletedError}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreJob={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteJob={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <JobFormDialog
        key={`${editorOpen ? "open" : "closed"}-${editorMode}-${editingId ?? "new"}`}
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        values={editorValues}
        errors={editorErrors}
        selectedFactory={selectedFactory}
        selectedBuyer={selectedBuyer}
        loadFactoryOptions={loadFactoryOptions}
        loadBuyerOptions={loadBuyerOptions}
        loadStyleOptions={loadStyleOptions}
        loadSizeOptions={loadSizeOptions}
        loadColorOptions={loadColorOptions}
        onFactoryOptionChange={setSelectedFactory}
        onBuyerOptionChange={setSelectedBuyer}
        onValuesChange={(values) => {
          const totalPoQty = values.jobDetails.reduce((total, detail) => total + (Number(detail.quantity) || 0), 0)
          setEditorValues({ ...values, totalPoQty: String(totalPoQty) })
        }}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditorValues(DEFAULT_FORM_VALUES)
            setSelectedFactory(null)
            setSelectedBuyer(null)
            setEditorErrors([])
            setEditorLoading(false)
            setEditorSubmitting(false)
            setEditingId(null)
          }
        }}
        onSubmit={() => void submitEditor(editorValues)}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        job={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        job={pendingActionTarget}
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
