"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
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
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrencies } from "@/features/app-config/currencies/currency.service"
import type { CurrencyRecord } from "@/features/app-config/currencies/currency.types"
import { fetchMaterialGroups } from "@/features/app-config/material-groups/material-group.service"
import type { MaterialGroupRecord } from "@/features/app-config/material-groups/material-group.types"
import { fetchMaterial, fetchMaterials } from "@/features/app-config/materials/material.service"
import { fetchUnits } from "@/features/app-config/units/unit.service"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { fetchFabricProcesses } from "@/features/merchandising/fabric-processes/fabric-process.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { FabricCostingFormDialog } from "./component/fabric-costing-form-dialog"
import {
  createFabricCosting,
  fetchFabricCosting,
  fetchFabricCostings,
  permanentlyDeleteFabricCosting,
  restoreFabricCosting,
  softDeleteFabricCosting,
  updateFabricCosting,
} from "./fabric-costing.service"
import type {
  FabricCostingFilterValues,
  FabricCostingFormError,
  FabricCostingFormValues,
  FabricCostingRecord,
  PaginationMeta,
} from "./fabric-costing.types"

type EditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type AccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const MENU_NAME = "Fabric Costing"
const EMPTY_ACCESS_RULES: AccessRules = { canView: false, canCreate: false, canUpdate: false, canDelete: false }
const DEFAULT_FILTERS: FabricCostingFilterValues = {
  costName: "",
  fabricId: "",
  currencyId: "",
  unitId: "",
}
const DEFAULT_FORM_VALUES: FabricCostingFormValues = {
  costName: "",
  fabricId: "",
  fabricLabel: "",
  qty: "1",
  unitId: "",
  unitLabel: "",
  currencyId: "",
  currencyLabel: "",
  yarns: [],
  commonProcesses: [],
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function formatCurrencyLabel(currencyName?: string | null, currencyCode?: string | null, symbol?: string | null) {
  const normalizedName = currencyName?.trim() ?? ""
  const normalizedCode = currencyCode?.trim() ?? ""
  const normalizedSymbol = symbol?.trim() ?? ""
  if (normalizedCode && normalizedName) return `${normalizedCode} - ${normalizedName}`
  return normalizedCode || normalizedName || normalizedSymbol
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function getUserName(user?: FabricCostingRecord["created_by_user"]) {
  return user?.display_name?.trim() || user?.name?.trim() || user?.user_name?.trim() || "Unknown user"
}

function getCostingLabel(record?: FabricCostingRecord | null) {
  return record?.costName?.trim() || record?.fabric?.name?.trim() || "this fabric costing"
}

function numberText(value?: string | number | null, fallback = "0") {
  if (value == null || value === "") return fallback
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue).replace(/\.?0+$/, "")
}

function getTotalYarnPrice(record: FabricCostingRecord) {
  return (record.yarns ?? []).reduce((total, yarn) => {
    const value = Number(yarn.totalYarnPrice ?? 0)
    return Number.isFinite(value) ? total + value : total
  }, 0)
}

function toCurrencyOption(currency: CurrencyRecord | null | undefined): AppComboboxOption | null {
  if (!currency) return null
  return {
    value: String(currency.id),
    label: formatCurrencyLabel(currency.currencyName, currency.currencyCode, currency.symbol) || String(currency.id),
  }
}

function recordToFormValues(record: FabricCostingRecord): FabricCostingFormValues {
  return {
    costName: record.costName ?? "",
    fabricId: record.fabricId ?? "",
    fabricLabel: record.fabric?.name ?? "",
    qty: numberText(record.qty, "1"),
    unitId: record.unitId == null ? "" : String(record.unitId),
    unitLabel: record.unit?.name ?? "",
    currencyId: record.currencyId == null ? "" : String(record.currencyId),
    currencyLabel: formatCurrencyLabel(
      record.currency?.currencyName,
      record.currency?.currencyCode,
      record.currency?.symbol,
    ),
    yarns: (record.yarns ?? []).map((yarn) => ({
      id: yarn.id || crypto.randomUUID(),
      yarnId: yarn.yarnId ?? "",
      yarnLabel: yarn.yarn?.code?.trim()
        ? `${yarn.yarn.code.trim()} - ${yarn.yarn.name?.trim() || ""}`.trim()
        : yarn.yarn?.name ?? "",
      percentagePerUnitFabric: numberText(yarn.percentagePerUnitFabric),
      yarnPricePerUnit: numberText(yarn.yarnPricePerUnit),
      totalYarnPrice: numberText(yarn.totalYarnPrice),
      yarnWiseProcesses: (yarn.yarnWiseProcesses ?? []).map((process) => ({
        id: process.id || crypto.randomUUID(),
        processId: process.processId == null ? "" : String(process.processId),
        processLabel: process.process?.name ?? "",
        rateUnitFabric: numberText(process.rateUnitFabric),
        wastagePercentage: numberText(process.wastagePercentage),
      })),
    })),
    commonProcesses: (record.commonProcesses ?? []).map((process) => ({
      id: process.id || crypto.randomUUID(),
      processId: process.processId == null ? "" : String(process.processId),
      processLabel: process.process?.name ?? "",
      ratePerUnitFabric: numberText(process.ratePerUnitFabric),
      wastagePercentage: numberText(process.wastagePercentage),
    })),
  }
}

function normalizeFormErrors(values: FabricCostingFormValues): FabricCostingFormError[] {
  const errors: FabricCostingFormError[] = []
  if (!values.currencyId.trim()) errors.push({ message: "Currency is required." })
  if (Number(values.qty) <= 0 || !Number.isFinite(Number(values.qty))) {
    errors.push({ message: "Quantity must be greater than zero." })
  }
  values.yarns.forEach((yarn, index) => {
    yarn.yarnWiseProcesses.forEach((process, processIndex) => {
      if (!process.processId.trim()) {
        errors.push({ message: `Yarn ${index + 1}, process ${processIndex + 1}: Process is required.` })
      }
    })
  })
  values.commonProcesses.forEach((process, index) => {
    if (!process.processId.trim()) {
      errors.push({ message: `Common process ${index + 1}: Process is required.` })
    }
  })
  return errors
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-96 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  )
}

function PageControls({
  meta,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: {
  meta: PaginationMeta | null
  page: number
  limit: number
  onPageChange: (nextPage: number) => void
  onLimitChange: (nextLimit: number) => void
}) {
  const totalPages = meta?.totalPages ?? 1
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm dark:border-white/10">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span>Rows</span>
        <AppSelect
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          options={[10, 20, 50].map((value) => ({ value: String(value), label: String(value) }))}
          triggerClassName="w-20"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(1)} disabled={page <= 1}>
          <ChevronsLeft className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-24 text-center text-xs font-semibold">
          Page {page} of {totalPages}
        </span>
        <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  record,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  record: FabricCostingRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete fabric costing</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete <span className="font-medium">{getCostingLabel(record)}</span>. You can restore it before removing it permanently.
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

function DeletedActionDialog({
  open,
  action,
  record,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  record: FabricCostingRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action === "restore" ? "Restore fabric costing" : "Delete fabric costing permanently"}</AlertDialogTitle>
          <AlertDialogDescription>
            {action === "restore" ? "Bring this fabric costing back into the active list." : "This will permanently remove this fabric costing and cannot be undone."}{" "}
            <span className="font-medium">{getCostingLabel(record)}</span>.
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

export function FabricCostingWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [accessRules, setAccessRules] = useState<AccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [records, setRecords] = useState<FabricCostingRecord[]>([])
  const [deletedRecords, setDeletedRecords] = useState<FabricCostingRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(10)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [loadingDeletedRecords, setLoadingDeletedRecords] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [draftFilters, setDraftFilters] = useState<FabricCostingFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<FabricCostingFilterValues>(DEFAULT_FILTERS)
  const [selectedFilterFabric, setSelectedFilterFabric] = useState<AppComboboxOption | null>(null)
  const [fabricMaterialGroupId, setFabricMaterialGroupId] = useState("")
  const fabricUnitRequestIdRef = useRef(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorErrors, setEditorErrors] = useState<FabricCostingFormError[]>([])
  const [editorValues, setEditorValues] = useState<FabricCostingFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FabricCostingRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [pendingActionTarget, setPendingActionTarget] = useState<FabricCostingRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const filterFabricValue =
    draftFilters.fabricId && selectedFilterFabric?.value === draftFilters.fabricId ? selectedFilterFabric : null

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No fabric costings found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) return "No deleted fabric costings"
    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const filterCount = [activeFilters.costName, activeFilters.fabricId, activeFilters.currencyId, activeFilters.unitId].filter((value) => value.trim()).length

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
      const nextOrganizationId =
        event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
      setPage(1)
      setDeletedPage(1)
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
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load fabric costing access right now."
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
        const data = await fetchFabricCostings({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page,
          limit,
          filters: activeFilters,
        })
        if (active) {
          setRecords(data.items)
          setMeta(data.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load fabric costings right now."
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
      if (!accessRules?.canDelete) {
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
        const data = await fetchFabricCostings({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          page: deletedPage,
          limit: deletedLimit,
          filters: DEFAULT_FILTERS,
          deletedOnly: true,
        })
        if (active) {
          setDeletedRecords(data.items)
          setDeletedMeta(data.meta)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load deleted fabric costings right now."
        if (!handleAuthFailure(message) && active) setDeletedError(message)
      } finally {
        if (active) setLoadingDeletedRecords(false)
      }
    }
    void loadDeletedRecords()
    return () => {
      active = false
    }
  }, [accessRules?.canDelete, apiUrl, deletedLimit, deletedPage, handleAuthFailure, loadingAccessRules, refreshVersion, selectedOrganizationId])

  const resolveFabricMaterialGroupId = useCallback(async () => {
    if (fabricMaterialGroupId) {
      return fabricMaterialGroupId
    }

    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")

    const data = await fetchMaterialGroups({
      apiUrl,
      accessToken: token,
      organizationId: selectedOrganizationId || undefined,
      page: 1,
      limit: 20,
      filters: { name: "Fabric", description: "", isActive: "true" },
    })

    const fabricGroup = data.items.find(
      (group: MaterialGroupRecord) => group.name.trim().toLowerCase() === "fabric",
    )

    const nextId = fabricGroup?.id ?? ""
    setFabricMaterialGroupId(nextId)
    return nextId
  }, [apiUrl, fabricMaterialGroupId, selectedOrganizationId])

  const loadMaterialOptions = useCallback(
    async ({ query, page: optionPage, limit: optionLimit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const nextFabricGroupId = fabricMaterialGroupId || (await resolveFabricMaterialGroupId())
      if (!nextFabricGroupId) return { items: [], hasNextPage: false }
      const data = await fetchMaterials({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        page: optionPage,
        limit: optionLimit,
        filters: {
          name: query,
          code: "",
          description: "",
          materialGroupId: nextFabricGroupId,
          isActive: "true",
        },
      })
      return {
        items: data.items.map((material) => ({
          value: material.id,
          label: material.name,
        })),
        hasNextPage: data.meta.hasNextPage,
      }
    },
    [apiUrl, fabricMaterialGroupId, resolveFabricMaterialGroupId, selectedOrganizationId],
  )

  useEffect(() => {
    let active = true

    async function loadFabricMaterialGroup() {
      try {
        const nextId = await resolveFabricMaterialGroupId()
        if (!active) return
        setFabricMaterialGroupId(nextId)
      } catch {
        if (!active) return
        setFabricMaterialGroupId("")
      }
    }

    void loadFabricMaterialGroup()

    return () => {
      active = false
    }
  }, [resolveFabricMaterialGroupId, selectedOrganizationId])

  const loadUnitOptions = useCallback(
    async ({ query, page: optionPage, limit: optionLimit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const data = await fetchUnits({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        page: optionPage,
        limit: optionLimit,
        filters: { name: query, isActive: "active" },
      })
      return {
        items: data.items.map((unit) => ({ value: String(unit.id), label: unit.name })),
        hasNextPage: data.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadCurrencyOptions = useCallback(
    async ({ query, page: optionPage, limit: optionLimit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const data = await fetchCurrencies({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        page: optionPage,
        limit: optionLimit,
        filters: { currencyName: query, currencyCode: "", symbol: "" },
      })
      return {
        items: data.items.map((currency) => ({
          value: String(currency.id),
          label: formatCurrencyLabel(currency.currencyName, currency.currencyCode, currency.symbol) || String(currency.id),
        })),
        hasNextPage: data.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadProcessOptions = useCallback(
    async ({ query, page: optionPage, limit: optionLimit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const data = await fetchFabricProcesses({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        page: optionPage,
        limit: optionLimit,
        filters: { name: query, isActive: "true" },
      })
      return {
        items: data.items.map((process) => ({ value: String(process.id), label: process.name })),
        hasNextPage: data.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadDefaultCurrencyOption = useCallback(async (): Promise<AppComboboxOption | null> => {
    const token = window.localStorage.getItem("access_token")
    if (!token) throw new Error("Your session expired. Please sign in again.")

    const data = await fetchCurrencies({
      apiUrl,
      accessToken: token,
      organizationId: selectedOrganizationId || undefined,
      page: 1,
      limit: 20,
      filters: { currencyName: "", currencyCode: "USD", symbol: "" },
    })

    const usdCurrency =
      data.items.find((currency) => currency.currencyCode?.trim().toUpperCase() === "USD") ??
      data.items.find((currency) => currency.currencyName?.trim().toUpperCase() === "USD") ??
      data.items[0] ??
      null

    return toCurrencyOption(usdCurrency)
  }, [apiUrl, selectedOrganizationId])

  const handleFabricChange = useCallback(
    async (option: AppComboboxOption | null) => {
      const requestId = fabricUnitRequestIdRef.current + 1
      fabricUnitRequestIdRef.current = requestId

      if (!option?.value) {
        setEditorValues((current) => ({
          ...current,
          unitId: "",
          unitLabel: "",
        }))
        return
      }

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const material = await fetchMaterial({
          apiUrl,
          accessToken: token,
          id: option.value,
          organizationId: selectedOrganizationId || undefined,
        })

        if (requestId !== fabricUnitRequestIdRef.current) {
          return
        }

        setEditorValues((current) => ({
          ...current,
          unitId: material.unitId == null ? "" : String(material.unitId),
          unitLabel: material.unit?.name?.trim() ?? "",
        }))
      } catch (caughtError) {
        if (requestId !== fabricUnitRequestIdRef.current) {
          return
        }

        const message = caughtError instanceof Error ? caughtError.message : "Unable to load the fabric unit."
        if (!handleAuthFailure(message)) {
          setEditorValues((current) => ({
            ...current,
            unitId: "",
            unitLabel: "",
          }))
        }
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  async function handleCreate() {
    setEditorMode("create")
    setEditingId(null)
    setEditorErrors([])
    setEditorOpen(true)
    setEditorLoading(true)

    try {
      const defaultCurrency = await loadDefaultCurrencyOption()
      await resolveFabricMaterialGroupId()
      setEditorValues({
        ...DEFAULT_FORM_VALUES,
        currencyId: defaultCurrency?.value ?? "",
        currencyLabel: defaultCurrency?.label ?? "",
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load the default currency."
      if (!handleAuthFailure(message)) {
        toast.error(message)
        setEditorValues(DEFAULT_FORM_VALUES)
      }
    } finally {
      setEditorLoading(false)
    }
  }

  async function handleEdit(id: string) {
    setEditorMode("edit")
    setEditingId(id)
    setEditorErrors([])
    setEditorLoading(true)
    setEditorOpen(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      const record = await fetchFabricCosting({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        id,
      })
      setEditorValues(recordToFormValues(record))
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load this fabric costing."
      if (!handleAuthFailure(message)) {
        toast.error(message)
        setEditorOpen(false)
      }
    } finally {
      setEditorLoading(false)
    }
  }

  async function handleSubmit() {
    const errors = normalizeFormErrors(editorValues)
    setEditorErrors(errors)
    if (errors.length) return

    setEditorSubmitting(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      if (editorMode === "create") {
        await createFabricCosting({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          payload: editorValues,
        })
        toast.success("Fabric costing created.")
      } else if (editingId) {
        await updateFabricCosting({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          id: editingId,
          payload: editorValues,
        })
        toast.success("Fabric costing updated.")
      }
      setEditorOpen(false)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save this fabric costing."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setEditorSubmitting(false)
    }
  }

  async function handleSoftDelete() {
    if (!deleteTarget) return
    setDeleteWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      await softDeleteFabricCosting({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        id: deleteTarget.id,
      })
      toast.success("Fabric costing deleted.")
      setDeleteTarget(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to delete this fabric costing."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setDeleteWorking(false)
    }
  }

  async function handleDeletedAction() {
    if (!pendingActionTarget || !pendingActionMode) return
    setPendingActionWorking(true)
    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }
      if (pendingActionMode === "restore") {
        await restoreFabricCosting({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          id: pendingActionTarget.id,
        })
        toast.success("Fabric costing restored.")
      } else {
        await permanentlyDeleteFabricCosting({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          id: pendingActionTarget.id,
        })
        toast.success("Fabric costing permanently deleted.")
      }
      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to complete this deleted record action."
      if (!handleAuthFailure(message)) toast.error(message)
    } finally {
      setPendingActionWorking(false)
    }
  }

  if (loadingAccessRules) return <WorkspaceSkeleton />

  if (!accessRules?.canView) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-xl font-semibold">Fabric Costing</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {accessError || "You do not have permission to view Fabric Costing."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl border bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Merchandising</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Fabric Costing
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Create and maintain fabric costing records with yarn and process cost mapping.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="secondary">Total {meta?.total ?? records.length}</Badge>
              <Badge variant="outline">Deleted {deletedMeta?.total ?? deletedRecords.length}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={triggerRefresh}>
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!accessRules.canCreate}>
              <Plus className="size-4" />
              New costing
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 border-b p-5 dark:border-white/10 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Fabric costing table</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pageSummary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Page {page} of {meta?.totalPages ?? 1}</Badge>
            <Badge variant="outline">{filterCount} active filters</Badge>
          </div>
        </div>

        <div className="grid gap-3 border-b p-4 dark:border-white/10 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto_auto]">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cost name</label>
            <Input
              value={draftFilters.costName}
              onChange={(event) => setDraftFilters((current) => ({ ...current, costName: event.target.value }))}
              placeholder="Input cost name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fabric</label>
            <AppCombobox
              value={filterFabricValue}
              onValueChange={(option) => {
                setSelectedFilterFabric(option)
                setDraftFilters((current) => ({ ...current, fabricId: option?.value ?? "" }))
              }}
              loadItems={loadMaterialOptions}
              placeholder="Search fabric"
              showClear
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full md:w-auto"
              onClick={() => {
                setActiveFilters(draftFilters)
                setPage(1)
              }}
            >
              <Search className="size-4" />
              Search
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => {
                setDraftFilters(DEFAULT_FILTERS)
                setActiveFilters(DEFAULT_FILTERS)
                setSelectedFilterFabric(null)
                setPage(1)
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {error ? (
          <div className="p-4 text-sm text-red-600 dark:text-red-300">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[20rem]" />
              <col className="w-[16rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[10rem]" />
              <col className="w-[13rem]" />
              <col className="w-[13rem]" />
              <col className="w-[5rem]" />
            </colgroup>
            <thead className="border-b text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Costing</th>
                <th className="px-4 py-3 font-semibold">Fabric</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Currency</th>
                <th className="px-4 py-3 font-semibold">Yarns</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/10">
              {loadingRecords
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4" colSpan={8}>
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                : records.map((record) => (
                    <tr key={record.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">
                            {getCostingLabel(record)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium">
                        {record.fabric?.name ?? "No fabric"}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <span className="font-semibold">{numberText(record.qty, "1")}</span>
                        <span className="ml-1 text-slate-500">{record.unit?.name ?? ""}</span>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {record.currency?.currencyCode ?? record.currency?.currencyName ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <p>{record.yarns?.length ?? 0} yarn rows</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Total {numberText(getTotalYarnPrice(record))}</p>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <p className="font-medium">{formatDateTime(record.created_at)}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">{getUserName(record.created_by_user)}</p>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <p className="font-medium">{record.updated_at ? formatDateTime(record.updated_at) : "Not edited yet"}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                          {record.updated_at ? getUserName(record.updated_by_user) : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={!accessRules.canUpdate} onClick={() => void handleEdit(record.id)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!accessRules.canDelete}
                              className="text-red-600"
                              onClick={() => setDeleteTarget(record)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loadingRecords && !records.length ? (
          <div className="px-4 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            No fabric costings found.
          </div>
        ) : null}

        <PageControls
          meta={meta}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit)
            setPage(1)
          }}
        />
      </section>

      {accessRules.canDelete ? (
        <section className="overflow-hidden rounded-3xl border bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 border-b p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Recently deleted</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
            </div>
            <Badge variant="outline">Deleted {deletedMeta?.total ?? deletedRecords.length}</Badge>
          </div>

          {deletedError ? (
            <div className="p-4 text-sm text-red-600 dark:text-red-300">{deletedError}</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[22rem]" />
                <col className="w-[14rem]" />
                <col className="w-[14rem]" />
                <col className="w-[5rem]" />
              </colgroup>
              <thead className="border-b text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Costing</th>
                  <th className="px-4 py-3 font-semibold">Deleted</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/10">
                {loadingDeletedRecords
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4" colSpan={4}>
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  : deletedRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-4">
                          <p className="break-words text-sm font-semibold">{getCostingLabel(record)}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{record.fabric?.name ?? "No fabric"}</p>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <p className="font-medium">{formatDateTime(record.deleted_at)}</p>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">{getUserName(record.deleted_by_user)}</p>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <p className="font-medium">{formatDateTime(record.created_at)}</p>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">{getUserName(record.created_by_user)}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setPendingActionTarget(record)
                                  setPendingActionMode("restore")
                                }}
                              >
                                <Undo2 className="size-3.5" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setPendingActionTarget(record)
                                  setPendingActionMode("permanent")
                                }}
                              >
                                <Trash2 className="size-3.5" />
                                Delete permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!loadingDeletedRecords && !deletedRecords.length ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No deleted fabric costings found.
            </div>
          ) : null}

          <PageControls
            meta={deletedMeta}
            page={deletedPage}
            limit={deletedLimit}
            onPageChange={setDeletedPage}
            onLimitChange={(nextLimit) => {
              setDeletedLimit(nextLimit)
              setDeletedPage(1)
            }}
          />
        </section>
      ) : null}

      <FabricCostingFormDialog
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        values={editorValues}
        errors={editorErrors}
        loadMaterialOptions={loadMaterialOptions}
        loadUnitOptions={loadUnitOptions}
        loadCurrencyOptions={loadCurrencyOptions}
        loadProcessOptions={loadProcessOptions}
        onFabricChange={handleFabricChange}
        onValuesChange={setEditorValues}
        onOpenChange={setEditorOpen}
        onSubmit={() => void handleSubmit()}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        record={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => void handleSoftDelete()}
      />

      <DeletedActionDialog
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
        onConfirm={() => void handleDeletedAction()}
      />
    </div>
  )
}
