"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck, Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import type { AppComboboxLoadParams, AppComboboxOption } from "@/components/app-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrencies } from "@/features/app-config/currencies/currency.service"
import { fetchSuppliers } from "@/features/app-config/suppliers/supplier.service"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { fetchBuyers } from "@/features/merchandising/buyers/buyer.service"
import { fetchJob, fetchJobNumbersByBuyer, fetchJobs } from "@/features/merchandising/jobs/job.service"
import type { JobDetailRecord } from "@/features/merchandising/jobs/job.types"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveOrderPlacementsSection } from "./component/active-order-placements-section"
import { DeletedOrderPlacementsSection } from "./component/deleted-order-placements-section"
import { OrderPlacementFormDialog } from "./component/order-placement-form-dialog"
import {
  createOrderPlacement,
  fetchOrderPlacement,
  fetchOrderPlacements,
  permanentlyDeleteOrderPlacement,
  restoreOrderPlacement,
  softDeleteOrderPlacement,
  updateOrderPlacement,
} from "./order-placement.service"
import type {
  OrderPlacementDetailFormValues,
  OrderPlacementDetailRecord,
  OrderPlacementFilterValues,
  OrderPlacementFormError,
  OrderPlacementFormValues,
  OrderPlacementRecord,
  PaginationMeta,
} from "./order-placement.types"

type EditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type AccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const MENU_NAME = "Order Placement"
const EMPTY_ACCESS_RULES: AccessRules = { canView: false, canCreate: false, canUpdate: false, canDelete: false }
const DEFAULT_FILTERS: OrderPlacementFilterValues = { buyerId: "", jobId: "", currencyId: "", factoryId: "", placementDate: "", isPlaced: "", pono: "" }
const DEFAULT_FORM_VALUES: OrderPlacementFormValues = {
  buyerId: "",
  jobId: "",
  currencyId: "",
  placementDate: new Date().toISOString().slice(0, 10),
  factoryId: "",
  isPlaced: false,
  orderPlacementDetails: [],
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function formatNumberForInput(value: string | number | null | undefined) {
  if (value == null || value === "") return "0"
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? String(numericValue) : String(value)
}

function formatStyleLabel(styleNo?: string | null, styleName?: string | null) {
  return [styleNo?.trim(), styleName?.trim()].filter(Boolean).join(" - ")
}

function getColorLabel(detail: Pick<JobDetailRecord, "color"> | Pick<OrderPlacementDetailRecord, "color">) {
  return detail.color?.colorDisplayName?.trim() || detail.color?.colorName?.trim() || ""
}

function calculateFactoryCm(quantity: string | number | null | undefined, factoryCm: string | number | null | undefined) {
  const quantityValue = Number(quantity)
  const cmValue = Number(factoryCm)
  if (!Number.isFinite(quantityValue) || !Number.isFinite(cmValue)) return "0"
  const total = quantityValue * (cmValue / 12)
  return Number.isInteger(total) ? String(total) : total.toFixed(2).replace(/\.?0+$/, "")
}

function calculateFactoryFob(quantity: string | number | null | undefined, factoryFob: string | number | null | undefined) {
  const quantityValue = Number(quantity)
  const fobValue = Number(factoryFob)
  if (!Number.isFinite(quantityValue) || !Number.isFinite(fobValue)) return "0"
  const total = quantityValue * fobValue
  return Number.isInteger(total) ? String(total) : total.toFixed(2).replace(/\.?0+$/, "")
}

function jobDetailToFormValue(detail: JobDetailRecord): OrderPlacementDetailFormValues {
  const quantity = formatNumberForInput(detail.quantity)
  const factoryCm = "0"
  const factoryFob = "0"
  return {
    id: crypto.randomUUID(),
    jobDetailId: detail.id,
    jobId: detail.jobId,
    poId: detail.poId,
    poLabel: detail.purchaseOrder?.pono ?? "",
    styleId: detail.styleId,
    styleLabel: formatStyleLabel(detail.style?.styleNo, detail.style?.styleName) || detail.styleId,
    sizeId: String(detail.sizeId),
    sizeLabel: detail.size?.sizeName ?? String(detail.sizeId),
    colorId: String(detail.colorId),
    colorLabel: getColorLabel(detail) || String(detail.colorId),
    quantity,
    fob: formatNumberForInput(detail.fob),
    cm: formatNumberForInput(detail.cm),
    deliveryDate: detail.deliveryDate ? String(detail.deliveryDate).slice(0, 10) : "",
    cuttingLimitPercentage: formatNumberForInput(detail.cuttingLimitPercentage),
    remarks: detail.remarks ?? "",
    factoryCm,
    factoryFob,
    factoryShipmentDate: "",
    totalFactoryCm: calculateFactoryCm(quantity, factoryCm),
    totalFactoryFob: calculateFactoryFob(quantity, factoryFob),
  }
}

function placementDetailToFormValue(detail: OrderPlacementDetailRecord): OrderPlacementDetailFormValues {
  const quantity = formatNumberForInput(detail.quantity)
  const factoryCm = formatNumberForInput(detail.factoryCm)
  const factoryFob = formatNumberForInput(detail.factoryFob)
  return {
    id: detail.id || crypto.randomUUID(),
    jobDetailId: detail.jobDetailId ?? "",
    jobId: detail.jobId,
    poId: detail.poId,
    poLabel: detail.purchaseOrder?.pono ?? "",
    styleId: detail.styleId,
    styleLabel: formatStyleLabel(detail.style?.styleNo, detail.style?.styleName) || detail.styleId,
    sizeId: String(detail.sizeId),
    sizeLabel: detail.size?.sizeName ?? String(detail.sizeId),
    colorId: String(detail.colorId),
    colorLabel: getColorLabel(detail) || String(detail.colorId),
    quantity,
    fob: formatNumberForInput(detail.fob),
    cm: formatNumberForInput(detail.cm),
    deliveryDate: detail.deliveryDate ? String(detail.deliveryDate).slice(0, 10) : "",
    cuttingLimitPercentage: formatNumberForInput(detail.cuttingLimitPercentage),
    remarks: detail.remarks ?? "",
    factoryCm,
    factoryFob,
    factoryShipmentDate: detail.factoryShipmentDate ? String(detail.factoryShipmentDate).slice(0, 10) : "",
    totalFactoryCm: formatNumberForInput(detail.totalFactoryCm ?? calculateFactoryCm(quantity, factoryCm)),
    totalFactoryFob: formatNumberForInput(detail.totalFactoryFob ?? calculateFactoryFob(quantity, factoryFob)),
  }
}

function normalizeFormErrors(values: OrderPlacementFormValues): OrderPlacementFormError[] {
  const errors: OrderPlacementFormError[] = []
  if (!values.buyerId.trim()) errors.push({ section: "basic-info", message: "Buyer is required." })
  if (!values.jobId.trim()) errors.push({ section: "basic-info", message: "Job is required." })
  if (!values.currencyId.trim()) errors.push({ section: "basic-info", message: "Currency is required." })
  if (!values.factoryId.trim()) errors.push({ section: "basic-info", message: "Factory is required." })
  if (!values.placementDate.trim()) errors.push({ section: "basic-info", message: "Placement date is required." })
  if (values.orderPlacementDetails.length === 0) errors.push({ section: "details", message: "At least one placement detail row is required." })
  values.orderPlacementDetails.forEach((detail, index) => {
    if (!detail.poId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: PO is required.` })
    if (!detail.styleId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: Style is required.` })
    if (!detail.sizeId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: Size is required.` })
    if (!detail.colorId.trim()) errors.push({ section: "details", message: `Row ${index + 1}: Color is required.` })
  })
  return errors
}

function getPlacementLabel(record?: OrderPlacementRecord | null) {
  return record?.job?.jobNo?.trim() || record?.orderPlacementDetails?.[0]?.purchaseOrder?.pono?.trim() || "this order placement"
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

function DeleteConfirmDialog({ open, record, working, onOpenChange, onConfirm }: { open: boolean; record: OrderPlacementRecord | null; working: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete order placement</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium">{getPlacementLabel(record)}</span>. You can restore it before removing it permanently.
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

function RecentlyDeletedDialog({ open, action, record, working, onOpenChange, onConfirm }: { open: boolean; action: PendingDeleteMode; record: OrderPlacementRecord | null; working: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  const title = action === "restore" ? "Restore order placement" : "Delete order placement permanently"
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {action === "restore" ? "Bring this order placement back into the active list." : "This will permanently remove the order placement and cannot be undone."}{" "}
            <span className="font-medium">{getPlacementLabel(record)}</span>.
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

export function OrderPlacementWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => (typeof window === "undefined" ? "" : readSelectedOrganizationId()))
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [accessRules, setAccessRules] = useState<AccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [records, setRecords] = useState<OrderPlacementRecord[]>([])
  const [deletedRecords, setDeletedRecords] = useState<OrderPlacementRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [loadingDeletedRecords, setLoadingDeletedRecords] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [draftFilters, setDraftFilters] = useState<OrderPlacementFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<OrderPlacementFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<OrderPlacementFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<OrderPlacementFilterValues>(DEFAULT_FILTERS)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorErrors, setEditorErrors] = useState<OrderPlacementFormError[]>([])
  const [editorValues, setEditorValues] = useState<OrderPlacementFormValues>(DEFAULT_FORM_VALUES)
  const [loadingJobDetails, setLoadingJobDetails] = useState(false)
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedJob, setSelectedJob] = useState<AppComboboxOption | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<AppComboboxOption | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<AppComboboxOption | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrderPlacementRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedRecord, setRecentlyDeletedRecord] = useState<OrderPlacementRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<OrderPlacementRecord | null>(null)
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
        const permission = await fetchCurrentMenuPermission({ apiUrl, accessToken: token, organizationId: selectedOrganizationId || undefined, menuName: MENU_NAME })
        if (active) setAccessRules(permission)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load order placement access right now."
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
    async function loadRecords() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setRecords([])
        setMeta(null)
        setLoadingRecords(false)
        return
      }
      setLoadingRecords(true)
      setError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchOrderPlacements({ apiUrl, accessToken: token, page, limit, filters: activeFilters, organizationId: selectedOrganizationId || undefined })
        if (active) {
          setRecords(response.items)
          setMeta(response.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load order placements right now."
        if (!handleAuthFailure(message) && active) setError(message)
      } finally {
        if (active) setLoadingRecords(false)
      }
    }
    void loadRecords()
    return () => {
      active = false
    }
  }, [accessRules?.canView, activeFilters, apiUrl, handleAuthFailure, limit, loadingAccessRules, page, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    let active = true
    async function loadDeletedRecords() {
      if (loadingAccessRules) return
      if (!accessRules?.canView) {
        setDeletedRecords([])
        setDeletedMeta(null)
        setLoadingDeletedRecords(false)
        return
      }
      setLoadingDeletedRecords(true)
      setDeletedError("")
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const response = await fetchOrderPlacements({ apiUrl, accessToken: token, page: deletedPage, limit: deletedLimit, filters: deletedActiveFilters, deletedOnly: true, organizationId: selectedOrganizationId || undefined })
        if (active) {
          setDeletedRecords(response.items)
          setDeletedMeta(response.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted order placements right now."
        if (!handleAuthFailure(message) && active) setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedRecords(false)
      }
    }
    void loadDeletedRecords()
    return () => {
      active = false
    }
  }, [accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const loadBuyerOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchBuyers({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { name: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
      return { items: response.items.map((buyer) => ({ value: buyer.id, label: buyer.displayName?.trim() || buyer.name })), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadSupplierOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchSuppliers({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { name: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
      return { items: response.items.map((supplier) => ({ value: supplier.id, label: [supplier.code?.trim(), supplier.name?.trim()].filter(Boolean).join(" - ") || supplier.name })), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadCurrencyOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchCurrencies({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { currencyName: query, currencyCode: query, symbol: query }, organizationId: selectedOrganizationId || undefined })
      return { items: response.items.map((currency) => ({ value: String(currency.id), label: [currency.currencyCode, currency.currencyName].filter(Boolean).join(" - ") })), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadAllJobOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchJobs({ apiUrl, accessToken: token, page: pageNumber, limit: Math.max(pageLimit, 50), filters: { isActive: "true" }, organizationId: selectedOrganizationId || undefined })
      const normalizedQuery = query.trim().toLowerCase()
      const items = response.items
        .filter((job) => !normalizedQuery || job.jobNo?.toLowerCase().includes(normalizedQuery))
        .slice(0, pageLimit)
        .map((job) => ({ value: job.id, label: job.jobNo?.trim() || job.id }))
      return { items, hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadFormJobOptions = useCallback(
    async ({ query }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      if (!editorValues.buyerId) return { items: [], hasNextPage: false }
      const jobs = await fetchJobNumbersByBuyer({ apiUrl, accessToken: token, buyerId: editorValues.buyerId, organizationId: selectedOrganizationId || undefined })
      const normalizedQuery = query.trim().toLowerCase()
      return {
        items: jobs
          .filter((job) => !normalizedQuery || job.jobNo?.toLowerCase().includes(normalizedQuery))
          .map((job) => ({ value: job.id, label: job.jobNo?.trim() || job.id })),
        hasNextPage: false,
      }
    },
    [apiUrl, editorValues.buyerId, selectedOrganizationId],
  )

  const loadJobDetails = useCallback(
    async (jobId: string) => {
      setLoadingJobDetails(true)
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) throw new Error("Your session expired. Please sign in again.")
        const job = await fetchJob({ apiUrl, accessToken: token, id: jobId, organizationId: selectedOrganizationId || undefined })
        return (job.jobDetails ?? []).map(jobDetailToFormValue)
      } finally {
        setLoadingJobDetails(false)
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  function resetEditorState() {
    setEditorValues({ ...DEFAULT_FORM_VALUES, placementDate: new Date().toISOString().slice(0, 10) })
    setSelectedBuyer(null)
    setSelectedJob(null)
    setSelectedCurrency(null)
    setSelectedSupplier(null)
    setEditorErrors([])
    setEditorLoading(false)
    setEditorSubmitting(false)
    setLoadingJobDetails(false)
    setEditingId(null)
  }

  function openCreateDialog() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create order placements.")
      return
    }
    resetEditorState()
    setEditorMode("create")
    setEditorOpen(true)
  }

  async function openEditDialog(id: string) {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update order placements.")
      return
    }
    setEditorMode("edit")
    setEditingId(id)
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorErrors([])
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      const record = await fetchOrderPlacement({ apiUrl, accessToken: token, id, organizationId: selectedOrganizationId || undefined })
      setEditorValues({
        buyerId: record.buyerId,
        jobId: record.jobId,
        currencyId: String(record.currencyId),
        placementDate: record.placementDate ? String(record.placementDate).slice(0, 10) : "",
        factoryId: record.factoryId,
        isPlaced: Boolean(record.isPlaced),
        orderPlacementDetails: (record.orderPlacementDetails ?? []).map(placementDetailToFormValue),
      })
      setSelectedBuyer({ value: record.buyerId, label: record.buyer?.displayName?.trim() || record.buyer?.name?.trim() || record.buyerId })
      setSelectedJob({ value: record.jobId, label: record.job?.jobNo?.trim() || record.jobId })
      setSelectedCurrency({ value: String(record.currencyId), label: [record.currency?.currencyCode?.trim(), record.currency?.currencyName?.trim()].filter(Boolean).join(" - ") || String(record.currencyId) })
      setSelectedSupplier({ value: record.factoryId, label: [record.factory?.code?.trim(), record.factory?.name?.trim()].filter(Boolean).join(" - ") || record.factoryId })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load order placement right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setEditorLoading(false)
    }
  }

  async function submitEditor(values: OrderPlacementFormValues) {
    const validationErrors = normalizeFormErrors(values)
    if (validationErrors.length) {
      setEditorErrors(validationErrors)
      toast.error("Please complete the required order placement fields.")
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
        await createOrderPlacement({ apiUrl, accessToken: token, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Order placement created successfully.")
      } else if (editingId) {
        await updateOrderPlacement({ apiUrl, accessToken: token, id: editingId, payload: values, organizationId: selectedOrganizationId || undefined })
        toast.success("Order placement updated successfully.")
      }
      setEditorOpen(false)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save order placement right now."
      if (!handleAuthFailure(message)) {
        setEditorErrors([{ section: "basic-info", message }])
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  function requestSoftDelete(record: OrderPlacementRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete order placements.")
      return
    }
    setDeleteTarget(record)
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
      await softDeleteOrderPlacement({ apiUrl, accessToken: token, id: deleteTarget.id, organizationId: selectedOrganizationId || undefined })
      setRecentlyDeletedRecord(deleteTarget)
      setDeleteTarget(null)
      toast.success("Order placement moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete order placement right now."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }

  function openPendingActionDialog(record: OrderPlacementRecord, mode: PendingDeleteMode) {
    setPendingActionTarget(record)
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
        await restoreOrderPlacement({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Order placement restored successfully.")
      } else {
        await permanentlyDeleteOrderPlacement({ apiUrl, accessToken: token, id: pendingActionTarget.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Order placement deleted permanently.")
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

  const activeTotal = meta?.total ?? records.length
  const deletedTotal = deletedMeta?.total ?? deletedRecords.length
  const placedCount = useMemo(() => records.filter((record) => record.isPlaced).length, [records])

  if ((loadingAccessRules || loadingRecords) && records.length === 0 && (loadingAccessRules || loadingDeletedRecords) && deletedRecords.length === 0 && !error && !deletedError && !accessError) {
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
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Order Placement</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Place job detail rows with supplier factory CM, FOB, and shipment dates.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Placed {placedCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedRecord ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" /> Refresh</Button>
                  {accessRules?.canCreate ? <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" /> New placement</Button> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {accessError && !accessRules?.canView ? <Card><CardContent className="p-6 text-sm text-destructive">{accessError}</CardContent></Card> : null}

          {recentlyDeletedRecord ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-900 dark:text-amber-100">{getPlacementLabel(recentlyDeletedRecord)} was soft deleted and can still be restored.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedRecord, "restore")}><Undo2 className="size-3.5" /> Restore</Button>
                  <Button type="button" variant="destructive" className="rounded-xl" onClick={() => openPendingActionDialog(recentlyDeletedRecord, "permanent")}><Trash2 className="size-3.5" /> Delete permanently</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {error ? <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card> : null}

          <ActiveOrderPlacementsSection
            records={records}
            meta={meta}
            page={page}
            limit={limit}
            loading={loadingRecords}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            loadBuyerOptions={loadBuyerOptions}
            loadJobOptions={loadAllJobOptions}
            loadCurrencyOptions={loadCurrencyOptions}
            loadSupplierOptions={loadSupplierOptions}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreate={openCreateDialog}
            onEdit={openEditDialog}
            onDelete={requestSoftDelete}
            onResetFilters={() => {
              setDraftFilters(DEFAULT_FILTERS)
              setActiveFilters(DEFAULT_FILTERS)
              setPage(1)
            }}
            canCreate={Boolean(accessRules?.canCreate)}
            canUpdate={Boolean(accessRules?.canUpdate)}
            canDelete={Boolean(accessRules?.canDelete)}
          />

          {accessRules?.canView ? (
            <DeletedOrderPlacementsSection
              deletedRecords={deletedRecords}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeleted={loadingDeletedRecords}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              loadBuyerOptions={loadBuyerOptions}
              loadJobOptions={loadAllJobOptions}
              loadSupplierOptions={loadSupplierOptions}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestore={Boolean(accessRules?.canUpdate)}
              canPermanentlyDelete={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <OrderPlacementFormDialog
        key={`${editorOpen ? "open" : "closed"}-${editorMode}-${editingId ?? "new"}`}
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        loadingJobDetails={loadingJobDetails}
        values={editorValues}
        errors={editorErrors}
        selectedBuyer={selectedBuyer}
        selectedJob={selectedJob}
        selectedCurrency={selectedCurrency}
        selectedSupplier={selectedSupplier}
        loadBuyerOptions={loadBuyerOptions}
        loadJobOptions={loadFormJobOptions}
        loadCurrencyOptions={loadCurrencyOptions}
        loadSupplierOptions={loadSupplierOptions}
        onBuyerOptionChange={setSelectedBuyer}
        onJobOptionChange={setSelectedJob}
        onCurrencyOptionChange={setSelectedCurrency}
        onSupplierOptionChange={setSelectedSupplier}
        onValuesChange={setEditorValues}
        onJobDetailsLoad={loadJobDetails}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) resetEditorState()
        }}
        onSubmit={() => void submitEditor(editorValues)}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        record={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        record={pendingActionTarget}
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
