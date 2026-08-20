"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Search, Trash2, Undo2 } from "lucide-react"
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
import { createColor, fetchColors } from "@/features/merchandising/colors/color.service"
import { fetchEmployee, fetchEmployees } from "@/features/hr-payroll/employee/employee.service"
import { createSize, fetchSizes } from "@/features/merchandising/sizes/size.service"
import { fetchStyles } from "@/features/merchandising/styles/style.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveJobsSection } from "./component/active-jobs-section"
import { DeletedJobsSection } from "./component/deleted-jobs-section"
import { JobPoSummaryDialog } from "./component/job-po-summary-dialog"
import { JobFormDialog } from "./component/job-form-dialog"
import {
  analyzeJobAiAssistFile,
  createJob,
  downloadJobPoDetailsUploadTemplate,
  fetchJob,
  fetchJobPoSummary,
  fetchJobs,
  fetchNextJobNumber,
  permanentlyDeleteJob,
  restoreJob,
  softDeleteJob,
  resolveJobAiAssistRow,
  uploadJobPoDetailsTemplate,
  updateJob,
} from "./job.service"
import type { JobAiAssistRow, JobDetailFormValues, JobDetailRecord, JobFilterValues, JobFormError, JobFormValues, JobPoDetailsUploadReport, JobPoSummaryResult, JobRecord, PaginationMeta } from "./job.types"

type JobEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type JobAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const MENU_NAME = "Job Entry"
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
  jobNo: "",
  factoryId: "",
  buyerId: "",
  merchandiserId: "",
  ordertype: "",
  totalPoQty: "0",
  poReceiveDate: "",
  isActive: true,
  jobDetails: [],
}

function getJobPoNumbers(job?: JobRecord | null) {
  const values = (job?.jobDetails ?? [])
    .map((detail) => detail.purchaseOrder?.pono?.trim())
    .filter((value): value is string => Boolean(value))
  return [...new Set(values)]
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function getJobLabel(job?: JobRecord | null) {
  const po = job?.jobDetails?.[0]?.purchaseOrder?.pono
  return po?.trim() || "this job entry"
}

function formatDetailNumberForInput(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return "0"
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return String(numericValue)
}

function detailToFormValue(detail: JobDetailRecord): JobDetailFormValues {
  return {
    id: detail.id || crypto.randomUUID(),
    pono: detail.purchaseOrder?.pono ?? "",
    styleId: detail.styleId ?? "",
    styleLabel: formatStyleLabel(detail.style?.styleNo, detail.style?.styleName) || "",
    sizeId: detail.sizeId == null ? "" : String(detail.sizeId),
    sizeLabel: detail.size?.sizeName ?? "",
    colorId: detail.colorId == null ? "" : String(detail.colorId),
    colorLabel: detail.color?.colorDisplayName?.trim() || detail.color?.colorName?.trim() || "",
    quantity: formatDetailNumberForInput(detail.quantity),
    fob: formatDetailNumberForInput(detail.fob),
    cm: formatDetailNumberForInput(detail.cm),
    deliveryDate: detail.deliveryDate ? String(detail.deliveryDate).slice(0, 10) : "",
    cuttingLimitPercentage: formatDetailNumberForInput(detail.cuttingLimitPercentage),
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

function getSuggestedJobNoFromMessage(message: string) {
  const match = message.match(/next available job number is\s+([^\s.]+)/i)
  return match?.[1] ?? ""
}

function formatStyleLabel(styleNo?: string | null, styleName?: string | null) {
  const normalizedStyleNo = styleNo?.trim() ?? ""
  const normalizedStyleName = styleName?.trim() ?? ""

  if (normalizedStyleNo && normalizedStyleName) {
    return `${normalizedStyleNo} - ${normalizedStyleName}`
  }

  return normalizedStyleNo || normalizedStyleName
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
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<JobFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<JobFilterValues>(DEFAULT_FILTERS)
  const [editorOpen, setEditorOpen] = useState(false)
  const [poSummaryOpen, setPoSummaryOpen] = useState(false)
  const [poSummaryInitialPoNumbers, setPoSummaryInitialPoNumbers] = useState<string[]>([])
  const [editorMode, setEditorMode] = useState<JobEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorErrors, setEditorErrors] = useState<JobFormError[]>([])
  const [editorValues, setEditorValues] = useState<JobFormValues>(DEFAULT_FORM_VALUES)
  const [editorJobNo, setEditorJobNo] = useState("")
  const [editorSuggestedJobNo, setEditorSuggestedJobNo] = useState("")
  const [selectedFactory, setSelectedFactory] = useState<AppComboboxOption | null>(null)
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedMerchandiser, setSelectedMerchandiser] = useState<AppComboboxOption | null>(null)
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
        const response = await fetchJobs({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        })
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
  }, [accessRules?.canView, apiUrl, deletedActiveFilters, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const loadFactoryOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchFactories({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { name: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
      return {
        items: response.items.map((factory) => ({ value: factory.id, label: factory.displayName?.trim() || factory.name })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadBuyerOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchBuyers({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { name: query, isActive: "true" }, organizationId: selectedOrganizationId || undefined })
      return {
        items: response.items.map((buyer) => ({ value: buyer.id, label: buyer.displayName?.trim() || buyer.name })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadEmployeeOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchEmployees({
        apiUrl,
        accessToken: token,
        page: pageNumber,
        limit: pageLimit,
        filters: { employeeName: query, isActive: "true" },
        organizationId: selectedOrganizationId,
      })
      return {
        items: response.items.map((employee) => ({
          value: employee.id,
          label: [employee.employeeCode?.trim(), employee.employeeName?.trim()].filter(Boolean).join(" - ") || employee.id,
        })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadStyleOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const buyerId = editorValues.buyerId.trim()
      if (!buyerId) {
        return {
          items: [],
          hasNextPage: false,
        }
      }

      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchStyles({
        apiUrl,
        accessToken: token,
        page: pageNumber,
        limit: pageLimit,
        filters: {
          styleNo: query,
          buyerId,
          isActive: "true",
        },
        organizationId: selectedOrganizationId || undefined,
      })
      return {
        items: response.items.map((style) => ({ value: style.id, label: formatStyleLabel(style.styleNo, style.styleName) || style.id })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, editorValues.buyerId, selectedOrganizationId],
  )

  const loadSizeOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchSizes({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { sizeName: query }, organizationId: selectedOrganizationId || undefined })
      return {
        items: response.items.filter((size) => size.deleted_at == null && size.isActive !== false).map((size) => ({ value: String(size.id), label: size.sizeName })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadColorOptions = useCallback(
    async ({ query, page: pageNumber, limit: pageLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const response = await fetchColors({ apiUrl, accessToken: token, page: pageNumber, limit: pageLimit, filters: { colorName: query }, organizationId: selectedOrganizationId || undefined })
      return {
        items: response.items.filter((color) => color.deleted_at == null && color.isActive !== false).map((color) => ({ value: String(color.id), label: color.colorDisplayName?.trim() || color.colorName })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const downloadPoDetailsTemplate = useCallback(async () => {
    if (!accessRules?.canCreate) {
      throw new Error("You do not have permission to download the PO details template.")
    }

    const token = window.localStorage.getItem("access_token")
    if (!token) {
      throw new Error("Your session expired. Please sign in again.")
    }

    try {
      return await downloadJobPoDetailsUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to download the PO details template right now."
      if (handleAuthFailure(message)) {
        throw new Error("Your session expired. Please sign in again.")
      }
      throw caughtError
    }
  }, [accessRules?.canCreate, apiUrl, handleAuthFailure, selectedOrganizationId])

  const uploadPoDetailsTemplate = useCallback(
    async (file: File, buyerId?: string): Promise<JobPoDetailsUploadReport> => {
      if (!accessRules?.canCreate) {
        throw new Error("You do not have permission to upload PO details.")
      }

      const token = window.localStorage.getItem("access_token")
      if (!token) {
        throw new Error("Your session expired. Please sign in again.")
      }

      try {
        return await uploadJobPoDetailsTemplate({
          apiUrl,
          accessToken: token,
          file,
          buyerId,
          organizationId: selectedOrganizationId || undefined,
        })
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to upload the PO details template right now."
        if (handleAuthFailure(message)) {
          throw new Error("Your session expired. Please sign in again.")
        }
        throw caughtError
      }
    },
    [accessRules?.canCreate, apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const savePoDetailsMissingSetup = useCallback(
    async (item: {
      kind: "style" | "color" | "size"
      value: string
      row?: {
        poNumber: string
        styleNo: string
        styleName: string
        color: string
        size: string
        quantity: number
        deliveryDate: string | null
        fob: number
      }
    }) => {
      if (!accessRules?.canCreate) {
        throw new Error("You do not have permission to save setup records.")
      }

      const token = window.localStorage.getItem("access_token")
      if (!token) {
        throw new Error("Your session expired. Please sign in again.")
      }

      try {
        if (item.kind === "style") {
          if (!item.row?.styleName?.trim()) {
            throw new Error(`Unable to add style "${item.value}" because style name was not returned. Please upload the template again.`)
          }

          await resolveJobAiAssistRow({
            apiUrl,
            accessToken: token,
            organizationId: selectedOrganizationId || undefined,
            buyerId: editorValues.buyerId.trim() || undefined,
            row: {
              poNumber: item.row.poNumber,
              styleNo: item.row.styleNo,
              styleName: item.row.styleName,
              color: item.row.color,
              size: item.row.size,
              quantity: item.row.quantity,
              deliveryDate: item.row.deliveryDate,
              fob: item.row.fob,
            },
          })
          return
        }

        if (item.kind === "color") {
          await createColor({
            apiUrl,
            accessToken: token,
            organizationId: selectedOrganizationId || undefined,
            payload: {
              colorName: item.value,
              colorDisplayName: item.value,
              colorDescription: "",
              colorHexCode: "",
              isActive: true,
            },
          })
          return
        }

        await createSize({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          payload: {
            sizeName: item.value,
            isActive: true,
          },
        })
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : `Unable to save ${item.kind} "${item.value}" right now.`
        if (handleAuthFailure(message)) {
          throw new Error("Your session expired. Please sign in again.")
        }
        throw caughtError
      }
    },
    [accessRules?.canCreate, apiUrl, editorValues.buyerId, handleAuthFailure, selectedOrganizationId],
  )

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
    setSelectedMerchandiser(null)
    setEditorJobNo("Loading...")
    setEditorSuggestedJobNo("")
    setEditorErrors([])
    setEditorLoading(false)
    setEditorOpen(true)

    async function loadNextJobNumber() {
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }
        const nextJobNumber = await fetchNextJobNumber({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
        })
        setEditorJobNo(nextJobNumber.jobNo)
        setEditorValues((currentValues) => (currentValues.jobNo.trim() ? currentValues : { ...currentValues, jobNo: nextJobNumber.jobNo }))
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load the next job number right now."
        if (!handleAuthFailure(message)) {
          setEditorJobNo("Unavailable")
          toast.error(message)
        }
      }
    }

    void loadNextJobNumber()
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
    setEditorSuggestedJobNo("")
    setEditorJobNo("")
    setSelectedMerchandiser(null)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      const record = await fetchJob({ apiUrl, accessToken: token, id, organizationId: selectedOrganizationId || undefined })
      let nextMerchandiser: AppComboboxOption | null = null
      if (record.merchandiserId) {
        try {
          const employee = await fetchEmployee({
            apiUrl,
            accessToken: token,
            id: record.merchandiserId,
            organizationId: selectedOrganizationId ?? "",
          })
          nextMerchandiser = {
            value: employee.id,
            label: [employee.employeeCode?.trim(), employee.employeeName?.trim()].filter(Boolean).join(" - ") || employee.id,
          }
        } catch {
          nextMerchandiser = {
            value: record.merchandiserId,
            label: record.merchandiser?.employeeName?.trim() || record.merchandiser?.employeeCode?.trim() || record.merchandiserId,
          }
        }
      }
      setEditorValues({
        jobNo: record.jobNo ?? "",
        factoryId: record.factoryId ?? "",
        buyerId: record.buyerId ?? "",
        merchandiserId: record.merchandiserId == null ? "" : String(record.merchandiserId),
        ordertype: record.ordertype ?? "",
        totalPoQty: String(record.totalPoQty ?? 0),
        poReceiveDate: record.poReceiveDate ? String(record.poReceiveDate).slice(0, 10) : "",
        isActive: record.isActive !== false,
        jobDetails: (record.jobDetails ?? []).map(detailToFormValue),
      })
      setEditorJobNo(record.jobNo ?? "")
      setSelectedFactory({ value: record.factoryId, label: record.factory?.displayName?.trim() || record.factory?.name?.trim() || record.factoryId })
      setSelectedBuyer({ value: record.buyerId, label: record.buyer?.displayName?.trim() || record.buyer?.name?.trim() || record.buyerId })
      setSelectedMerchandiser(nextMerchandiser)
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
        const createdJob = await createJob({ apiUrl, accessToken: token, payload: nextValues, organizationId: selectedOrganizationId || undefined })
        toast.success(`Job ${createdJob.jobNo || "record"} has been created successfully.`)
      } else if (editingId) {
        await updateJob({ apiUrl, accessToken: token, id: editingId, payload: nextValues, organizationId: selectedOrganizationId || undefined })
        toast.success("Purchase order updated successfully.")
      }
      setEditorOpen(false)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save purchase order right now."
      if (!handleAuthFailure(message)) {
        setEditorSuggestedJobNo(getSuggestedJobNoFromMessage(message))
        setEditorErrors([{ section: "basic-info", message }])
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  async function analyzeAiAssistFile(file: File): Promise<JobAiAssistRow[]> {
    const token = window.localStorage.getItem("access_token")
    if (!token) {
      handleAuthFailure("Your session expired. Please sign in again.")
      return []
    }

    try {
      const result = await analyzeJobAiAssistFile({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })
      toast.success(`AI Assist extracted ${result.rows.length} row${result.rows.length === 1 ? "" : "s"}.`)
      return result.rows
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to analyze this file right now."
      if (!handleAuthFailure(message)) toast.error(message)
      throw caughtError
    }
  }

  async function resolveAiAssistRowMasterData({
    row,
    buyerId,
  }: {
    row: JobAiAssistRow
    buyerId?: string
  }): Promise<{ styleOption: AppComboboxOption | null; sizeOption: AppComboboxOption | null; colorOption: AppComboboxOption | null }> {
    const token = window.localStorage.getItem("access_token")
    if (!token) {
      handleAuthFailure("Your session expired. Please sign in again.")
      return { styleOption: null, sizeOption: null, colorOption: null }
    }

    try {
      const resolved = await resolveJobAiAssistRow({
        apiUrl,
        accessToken: token,
        row,
        buyerId,
        organizationId: selectedOrganizationId || undefined,
      })
      return {
        styleOption: resolved.styleOption,
        sizeOption: resolved.sizeOption,
        colorOption: resolved.colorOption,
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to resolve this AI Assist row right now."
      if (!handleAuthFailure(message)) toast.error(message)
      throw caughtError
    }
  }

  async function searchPoSummary(poNumber: string): Promise<JobPoSummaryResult> {
    const token = window.localStorage.getItem("access_token")
    if (!token) {
      handleAuthFailure("Your session expired. Please sign in again.")
      throw new Error("Your session expired. Please sign in again.")
    }

    try {
      return await fetchJobPoSummary({
        apiUrl,
        accessToken: token,
        pono: poNumber,
        organizationId: selectedOrganizationId || undefined,
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load PO summary right now."
      handleAuthFailure(message)
      throw caughtError
    }
  }

  const loadRecentPoSummaryOptions = useCallback(
    async (limit: number) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      try {
        const response = await fetchJobs({
          apiUrl,
          accessToken: token,
          page: 1,
          limit: Math.max(limit * 5, 50),
          filters: {},
          organizationId: selectedOrganizationId || undefined,
        })

        const recentOptions = new Map<
          string,
          { label: string; value: string; jobIds: Set<string>; rowCount: number }
        >()

        for (const job of response.items) {
          for (const detail of job.jobDetails ?? []) {
            const poNumber = detail.purchaseOrder?.pono?.trim()
            if (!poNumber) continue

            const currentOption = recentOptions.get(poNumber) ?? {
              label: poNumber,
              value: poNumber,
              jobIds: new Set<string>(),
              rowCount: 0,
            }

            currentOption.jobIds.add(job.id)
            currentOption.rowCount += 1
            recentOptions.set(poNumber, currentOption)
          }
        }

        return Array.from(recentOptions.values())
          .slice(0, limit)
          .map(({ jobIds, rowCount, ...option }) => ({
            ...option,
            jobCount: jobIds.size,
            rowCount,
          }))
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load recent PO numbers right now."
        if (!handleAuthFailure(message)) throw caughtError
        throw caughtError
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId]
  )

  const openPoSummaryDialog = useCallback((job?: JobRecord | null) => {
    setPoSummaryInitialPoNumbers(getJobPoNumbers(job))
    setPoSummaryOpen(true)
  }, [])

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
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Job Entry</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create, review, and maintain job entry records.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">Total {activeTotal}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Active {activeCount}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Deleted {deletedTotal}</Badge>
                    {recentlyDeletedJob ? <Badge variant="destructive" className="rounded-full px-3 py-1">Recently deleted</Badge> : null}
                  </div>
                </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl"><RefreshCcw className="size-3.5" /> Refresh</Button>
                  <Button type="button" variant="outline" onClick={() => openPoSummaryDialog()} className="rounded-xl"><Search className="size-3.5" /> PO Summary</Button>
                  {accessRules?.canCreate ? <Button type="button" onClick={openCreateDialog} className="rounded-xl"><Plus className="size-3.5" /> New job</Button> : null}
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
            loadFactoryOptions={loadFactoryOptions}
            loadBuyerOptions={loadBuyerOptions}
            loadEmployeeOptions={loadEmployeeOptions}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateJob={openCreateDialog}
            onEditJob={openEditDialog}
            onDeleteJob={requestSoftDelete}
            onOpenPoSummary={openPoSummaryDialog}
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
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              loadFactoryOptions={loadFactoryOptions}
              loadBuyerOptions={loadBuyerOptions}
              loadEmployeeOptions={loadEmployeeOptions}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
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
        jobNo={editorJobNo}
        suggestedJobNo={editorSuggestedJobNo}
        selectedFactory={selectedFactory}
        selectedBuyer={selectedBuyer}
        selectedMerchandiser={selectedMerchandiser}
        loadFactoryOptions={loadFactoryOptions}
        loadBuyerOptions={loadBuyerOptions}
        loadEmployeeOptions={loadEmployeeOptions}
        loadStyleOptions={loadStyleOptions}
        loadSizeOptions={loadSizeOptions}
        loadColorOptions={loadColorOptions}
        onFactoryOptionChange={setSelectedFactory}
        onBuyerOptionChange={setSelectedBuyer}
        onMerchandiserOptionChange={setSelectedMerchandiser}
        onValuesChange={(values) => {
          const totalPoQty = values.jobDetails.reduce((total, detail) => total + (Number(detail.quantity) || 0), 0)
          if (editorSuggestedJobNo && values.jobNo !== editorValues.jobNo) {
            setEditorSuggestedJobNo("")
            setEditorErrors((currentErrors) => currentErrors.filter((error) => !error.message.includes("next available job number")))
          }
          setEditorValues({ ...values, totalPoQty: String(totalPoQty) })
        }}
        onAiAssistFileAnalyze={analyzeAiAssistFile}
        onAiAssistRowResolve={({ row, buyerId }) => resolveAiAssistRowMasterData({ row, buyerId })}
        onPoDetailsTemplateDownload={downloadPoDetailsTemplate}
        onPoDetailsTemplateUpload={uploadPoDetailsTemplate}
        onPoDetailsMissingSetupSave={savePoDetailsMissingSetup}
        loadRecentPoOptions={loadRecentPoSummaryOptions}
        onPoSummarySearch={searchPoSummary}
        onUseSuggestedJobNo={(nextJobNo) => {
          setEditorValues((currentValues) => ({ ...currentValues, jobNo: nextJobNo }))
          setEditorSuggestedJobNo("")
          setEditorErrors((currentErrors) => currentErrors.filter((error) => !error.message.includes("next available job number")))
        }}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditorValues(DEFAULT_FORM_VALUES)
            setSelectedFactory(null)
            setSelectedBuyer(null)
            setSelectedMerchandiser(null)
            setEditorJobNo("")
            setEditorSuggestedJobNo("")
            setEditorErrors([])
            setEditorLoading(false)
            setEditorSubmitting(false)
            setEditingId(null)
          }
        }}
        onSubmit={() => void submitEditor(editorValues)}
      />

      {poSummaryOpen ? (
        <JobPoSummaryDialog
          open={poSummaryOpen}
          onOpenChange={(open) => {
            setPoSummaryOpen(open)
            if (!open) {
              setPoSummaryInitialPoNumbers([])
            }
          }}
          loadRecentPoOptions={loadRecentPoSummaryOptions}
          initialPoNumbers={poSummaryInitialPoNumbers}
          onSearch={searchPoSummary}
        />
      ) : null}

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
