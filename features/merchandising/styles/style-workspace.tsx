"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2, Users } from "lucide-react"
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

import { type AppComboboxLoadParams, type AppComboboxOption } from "@/components/app-combobox"
import { fetchBuyers } from "@/features/merchandising/buyers/buyer.service"
import { fetchCurrencies } from "@/features/app-config/currencies/currency.service"
import { fetchColors } from "@/features/merchandising/colors/color.service"
import { fetchSizes } from "@/features/merchandising/sizes/size.service"
import { fetchEmbellishments } from "@/features/merchandising/embellishments/embellishment.service"
import type {
  BuyerSummary,
  ColorSummary,
  CurrencySummary,
  EmbellishmentSummary,
  SizeSummary,
  StyleFilterValues,
  StyleFormError,
  StyleFormValues,
  StyleRecord,
  PaginationMeta,
} from "./style.types"

import { StyleFormDialog } from "./component/style-form-dialog"
import { ActiveStylesSection } from "./component/active-styles-section"
import { DeletedStylesSection } from "./component/deleted-styles-section"
import {
  createStyle,
  fetchStyle,
  fetchStyles,
  permanentlyDeleteStyle,
  restoreStyle,
  softDeleteStyle,
  updateStyle,
} from "./style.service"

type StyleEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type StyleAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

type BuyerOption = BuyerSummary & AppComboboxOption
type CurrencyOption = CurrencySummary & AppComboboxOption
type ColorOption = ColorSummary & AppComboboxOption
type SizeOption = SizeSummary & AppComboboxOption
type EmbellishmentOption = EmbellishmentSummary & AppComboboxOption

const STYLE_MENU_NAME = "Style Setup"
const EMPTY_ACCESS_RULES: StyleAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: StyleFilterValues = {
  productType: "",
  buyerId: "",
  styleNo: "",
  styleName: "",
  currencyId: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: StyleFormValues = {
  productType: "",
  buyerId: "",
  styleNo: "",
  styleName: "",
  itemType: "",
  productDepartment: "",
  cmSewing: "0",
  currencyId: "",
  smvSewing: "0",
  smvSewingSideSeam: "0",
  smvCutting: "0",
  smvCuttingSideSeam: "0",
  smvFinishing: "0",
  imageId: "",
  remarks: "",
  isActive: true,
  itemUom: "",
  productFamily: "",
  colors: [],
  sizes: [],
  embellishments: [],
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
]

const ITEM_UOM_OPTIONS = [
  { value: "none", label: "Select UOM" },
  { value: "Pcs", label: "Pcs" },
  { value: "Set", label: "Set" },
]

function getStyleLabel(style: StyleRecord) {
  return style.styleNo?.trim() || style.styleName?.trim()
}

function getBuyerLabel(buyer?: BuyerSummary | null, buyerId?: string | null) {
  return (
    buyer?.displayName?.trim() ||
    buyer?.name?.trim() ||
    (buyerId ? `Buyer #${buyerId}` : "No buyer")
  )
}

function getCurrencyLabel(currency?: CurrencySummary | null, currencyId?: number | null) {
  return (
    currency?.currencyName?.trim() ||
    currency?.currencyCode?.trim() ||
    (currencyId != null ? `Currency #${currencyId}` : "No currency")
  )
}

function toBuyerOption(buyer: BuyerSummary | null | undefined): BuyerOption | null {
  if (buyer?.id == null) {
    return null
  }

  return {
    ...buyer,
    label: buyer.displayName?.trim() || buyer.name?.trim() || `Buyer #${buyer.id}`,
    value: String(buyer.id),
  }
}

function toCurrencyOption(currency: CurrencySummary | null | undefined): CurrencyOption | null {
  if (currency?.id == null) {
    return null
  }

  return {
    ...currency,
    label: currency.currencyName?.trim() || currency.currencyCode?.trim() || `Currency #${currency.id}`,
    value: String(currency.id),
  }
}

function mapChildOption(
  value: string | number | null | undefined,
  label: string | null | undefined,
): AppComboboxOption | null {
  if (value == null) {
    return null
  }

  return {
    value: String(value),
    label: label?.trim() || String(value),
  }
}

function normalizeStyleFormErrors(values: StyleFormValues): StyleFormError[] {
  const errors: StyleFormError[] = []

  if (!values.buyerId.trim()) {
    errors.push({ section: "basic-info", message: "Buyer is required." })
  }

  if (!values.currencyId.trim()) {
    errors.push({ section: "basic-info", message: "Currency is required." })
  }

  if (!values.styleNo.trim()) {
    errors.push({ section: "basic-info", message: "Style No is required." })
  }

  return errors
}

function normalizeAuthFailure(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized")
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
        <Users className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

const FILTER_SKELETONS = Array.from({ length: 6 })
const ROW_SKELETONS = Array.from({ length: 5 })

function StyleSectionSkeleton({ deleted = false }: { deleted?: boolean }) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardContent className="border-b border-slate-200/70 p-4 dark:border-white/10 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-44 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            {!deleted ? <Skeleton className="h-8 w-8 rounded-full" /> : null}
          </div>
        </div>
      </CardContent>
      <CardContent className="p-3 sm:p-0 sm:px-2">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {FILTER_SKELETONS.slice(0, deleted ? 5 : 6).map((_, index) => (
            <div key={index} className="min-w-0 space-y-1">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
          ))}
          <div className={deleted ? "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end" : "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-6"}>
            <Skeleton className="h-9 w-full rounded-xl sm:w-24" />
            <Skeleton className="h-9 w-full rounded-xl sm:w-20" />
            {!deleted ? <Skeleton className="h-9 w-full rounded-xl sm:w-28" /> : null}
          </div>
        </div>
      </CardContent>
      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="hidden lg:block">
          <div className="space-y-3 p-4">
            {ROW_SKELETONS.map((_, index) => (
              <div key={index} className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr_0.6fr] items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-28 rounded-full" />
                    <Skeleton className="h-3 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-3 w-32 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                </div>
                <Skeleton className="ml-auto size-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {ROW_SKELETONS.map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-4 sm:p-8 sm:py-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-48 rounded-full" />
                  <Skeleton className="h-10 w-44 rounded-full sm:w-56" />
                  <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
                  <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          <StyleSectionSkeleton />
          <StyleSectionSkeleton deleted />
        </div>
      </ScrollArea>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  style,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  style: StyleRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete style</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {style ? getStyleLabel(style) : "this style"}
            </span>
            . You can restore it from the recently deleted card before removing it permanently.
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
  style,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  style: StyleRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore style" : "Delete style permanently"
  const description =
    action === "restore"
      ? "Bring this style back into the active merchandising list."
      : "This will permanently remove the style record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {style ? getStyleLabel(style) : "this style"}
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

export function StyleWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingStyles, setLoadingStyles] = useState(true)
  const [loadingDeletedStyles, setLoadingDeletedStyles] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<StyleAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [styles, setStyles] = useState<StyleRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedStyles, setDeletedStyles] = useState<StyleRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [buyerOptions, setBuyerOptions] = useState<BuyerSummary[]>([])

  const [draftFilters, setDraftFilters] = useState<StyleFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<StyleFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<StyleFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<StyleFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<StyleEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorErrors, setEditorErrors] = useState<StyleFormError[]>([])
  const [editorValues, setEditorValues] = useState<StyleFormValues>(DEFAULT_FORM_VALUES)
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<StyleRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedStyle, setRecentlyDeletedStyle] = useState<StyleRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<StyleRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
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
      handleOrganizationChange,
    )

    return () => {
      window.removeEventListener(
        SELECTED_ORGANIZATION_CHANGED_EVENT,
        handleOrganizationChange,
      )
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

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

        const storedUser = parseStoredAuthUser(
          window.localStorage.getItem("auth_user"),
        )

        if (storedUser?.role === "admin") {
          if (active) {
            setAccessRules({
              canView: true,
              canCreate: true,
              canUpdate: true,
              canDelete: true,
            })
          }
          return
        }

        const permission = await fetchCurrentMenuPermission({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId || undefined,
          menuName: STYLE_MENU_NAME,
        })

        if (!active) {
          return
        }

        setAccessRules({
          canView: permission.canView,
          canCreate: permission.canCreate,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
        })
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your style menu access right now."

        if (handleAuthFailure(message)) {
          return
        }

        setAccessRules(EMPTY_ACCESS_RULES)
        setAccessError(message)
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
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadBuyerOptionsFromApi() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        if (active) {
          setBuyerOptions([])
        }
        return
      }

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const pageSize = 100
        const nextBuyerOptions: BuyerSummary[] = []
        let currentPage = 1
        let hasNextPage = true

        while (hasNextPage) {
          const response = await fetchBuyers({
            apiUrl,
            accessToken: token,
            page: currentPage,
            limit: pageSize,
            filters: { name: "" },
            organizationId: selectedOrganizationId || undefined,
          })

          if (!active) {
            return
          }

          nextBuyerOptions.push(
            ...response.items.filter((buyer) => buyer.deleted_at == null && buyer.isActive !== false),
          )
          hasNextPage = response.meta.hasNextPage
          currentPage += 1
        }

        if (active) {
          setBuyerOptions(nextBuyerOptions)
        }
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load style buyers right now."

        if (!handleAuthFailure(message)) {
          setBuyerOptions([])
        }
      }
    }

    void loadBuyerOptionsFromApi()

    return () => {
      active = false
    }
  }, [accessRules?.canView, apiUrl, handleAuthFailure, loadingAccessRules, selectedOrganizationId])

  const openEditDialog = useCallback(
    async (styleId: string) => {
      if (!accessRules?.canUpdate) {
        toast.error("You do not have permission to update styles.")
        return
      }

      setEditorMode("edit")
      setEditingId(styleId)
      setEditorErrors([])
      setEditorSubmitting(false)
      setEditorLoading(true)
      setEditorValues(DEFAULT_FORM_VALUES)
      setSelectedBuyer(null)
      setSelectedCurrency(null)
      setEditorOpen(true)

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const record = await fetchStyle({
          apiUrl,
          accessToken: token,
          id: styleId,
          organizationId: selectedOrganizationId || undefined,
        })

        const nextBuyer = toBuyerOption(record.buyer) ?? mapChildOption(record.buyerId, getBuyerLabel(record.buyer, record.buyerId))
        const nextCurrency = toCurrencyOption(record.currency) ?? mapChildOption(record.currencyId, getCurrencyLabel(record.currency, record.currencyId))

        setEditorValues({
          buyerId: record.buyerId ?? "",
          productType: record.productType ?? "",
          styleNo: record.styleNo ?? "",
          styleName: record.styleName ?? "",
          itemType: record.itemType ?? "",
          productDepartment: record.productDepartment ?? "",
          cmSewing: record.cmSewing != null ? String(record.cmSewing) : "0",
          currencyId: record.currencyId != null ? String(record.currencyId) : "",
          smvSewing: record.smvSewing != null ? String(record.smvSewing) : "0",
          smvSewingSideSeam: record.smvSewingSideSeam != null ? String(record.smvSewingSideSeam) : "0",
          smvCutting: record.smvCutting != null ? String(record.smvCutting) : "0",
          smvCuttingSideSeam: record.smvCuttingSideSeam != null ? String(record.smvCuttingSideSeam) : "0",
          smvFinishing: record.smvFinishing != null ? String(record.smvFinishing) : "0",
          imageId: record.imageId != null ? String(record.imageId) : "",
          remarks: record.remarks ?? "",
          isActive: record.isActive !== false,
          itemUom: record.itemUom ?? "",
          productFamily: record.productFamily ?? "",
          colors: record.styleToColorMaps?.map((map) => ({
            id: String(map.id ?? crypto.randomUUID()),
            value: String(map.colorId),
            label: map.color?.colorDisplayName?.trim() || map.color?.colorName?.trim() || String(map.colorId),
          })) ?? [],
          sizes: record.styleToSizeMaps?.map((map) => ({
            id: String(map.id ?? crypto.randomUUID()),
            value: String(map.sizeId),
            label: map.size?.sizeName?.trim() || String(map.sizeId),
          })) ?? [],
          embellishments: record.styleToEmbellishmentMaps?.map((map) => ({
            id: String(map.id ?? crypto.randomUUID()),
            value: String(map.embellishmentId),
            label: map.embellishment?.name?.trim() || String(map.embellishmentId),
          })) ?? [],
        })
        setSelectedBuyer(nextBuyer)
        setSelectedCurrency(nextCurrency)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the style record right now."

        if (!handleAuthFailure(message)) {
          setEditorErrors([{ section: "basic-info", message }])
          toast.error(message)
        }
      } finally {
        setEditorLoading(false)
      }
    },
    [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadBuyerOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchBuyers({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { name: query },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items
          .filter((buyer) => buyer.deleted_at == null && buyer.isActive !== false)
          .map<BuyerOption>((buyer) => ({
            ...buyer,
            label: buyer.displayName?.trim() || buyer.name?.trim() || `Buyer #${buyer.id}`,
            value: String(buyer.id),
          })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadCurrencyOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchCurrencies({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { currencyName: query },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items
          .map<CurrencyOption>((currency) => ({
            ...currency,
            label: currency.currencyName?.trim() || currency.currencyCode?.trim() || `Currency #${currency.id}`,
            value: String(currency.id),
          })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadColorOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchColors({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { colorName: query, colorDisplayName: query },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items
          .filter((color) => color.deleted_at == null && color.isActive !== false)
          .map<ColorOption>((color) => ({
            ...color,
            label: color.colorDisplayName?.trim() || color.colorName?.trim() || `Color #${color.id}`,
            value: String(color.id),
          })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadSizeOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchSizes({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { sizeName: query },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items
          .filter((size) => size.deleted_at == null && size.isActive !== false)
          .map<SizeOption>((size) => ({
            ...size,
            label: size.sizeName?.trim() || `Size #${size.id}`,
            value: String(size.id),
          })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadEmbellishmentOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchEmbellishments({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { name: query },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items
          .filter((embellishment) => embellishment.deleted_at == null && embellishment.isActive !== "N")
          .map<EmbellishmentOption>((embellishment) => ({
            ...embellishment,
            label: embellishment.name?.trim() || `Embellishment #${embellishment.id}`,
            value: String(embellishment.id),
          })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const openPendingActionDialog = useCallback(
    (style: StyleRecord, mode: PendingDeleteMode) => {
      if (mode === "restore" && !accessRules?.canUpdate) {
        toast.error("You do not have permission to restore styles.")
        return
      }

      if (mode === "permanent" && !accessRules?.canDelete) {
        toast.error("You do not have permission to permanently delete styles.")
        return
      }

      setPendingActionTarget(style)
      setPendingActionMode(mode)
    },
    [accessRules?.canDelete, accessRules?.canUpdate],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadStyles() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setStyles([])
        setMeta(null)
        setLoadingStyles(false)
        return
      }

      setLoadingStyles(true)
      setError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchStyles({
          apiUrl,
          accessToken: token,
          page,
          limit,
          filters: activeFilters,
          organizationId: selectedOrganizationId || undefined,
        })

        if (!active) {
          return
        }

        setStyles(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load styles right now."

        if (handleAuthFailure(message)) {
          return
        }

        setError(message)
      } finally {
        if (active) {
          setLoadingStyles(false)
        }
      }
    }

    void loadStyles()

    return () => {
      active = false
    }
  }, [
    accessRules?.canView,
    activeFilters,
    apiUrl,
    handleAuthFailure,
    limit,
    loadingAccessRules,
    page,
    refreshVersion,
    selectedOrganizationId,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadDeletedStyles() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setDeletedStyles([])
        setDeletedMeta(null)
        setLoadingDeletedStyles(false)
        return
      }

      setLoadingDeletedStyles(true)
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchStyles({
          apiUrl,
          accessToken: token,
          page: deletedPage,
          limit: deletedLimit,
          filters: deletedActiveFilters,
          deletedOnly: true,
          organizationId: selectedOrganizationId || undefined,
        })

        if (!active) {
          return
        }

        setDeletedStyles(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load deleted styles right now."

        if (handleAuthFailure(message)) {
          return
        }

        setDeletedError(message)
      } finally {
        if (active) {
          setLoadingDeletedStyles(false)
        }
      }
    }

    void loadDeletedStyles()

    return () => {
      active = false
    }
  }, [
    accessRules?.canView,
    apiUrl,
    deletedActiveFilters,
    deletedLimit,
    deletedPage,
    handleAuthFailure,
    loadingAccessRules,
    refreshVersion,
    selectedOrganizationId,
  ])

  const activeCount = useMemo(
    () => styles.filter((style) => style.isActive !== false && !style.deleted_at).length,
    [styles],
  )

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
      toast.error("You do not have permission to create styles.")
      return
    }

    setEditorMode("create")
    setEditingId(null)
    setEditorErrors([])
    setEditorValues(DEFAULT_FORM_VALUES)
    setSelectedBuyer(null)
    setSelectedCurrency(null)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  async function downloadTemplate() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to use style import/export actions.")
      return
    }

    toast.info("Style import/export templates are not available yet.")
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file) {
      return
    }

    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to use style import/export actions.")
      return
    }

    toast.info("Style import/export templates are not available yet.")
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ""
    }
  }

  function requestSoftDelete(style: StyleRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete styles.")
      return
    }

    setDeleteTarget(style)
  }

  async function submitEditor(values: StyleFormValues) {
    if (editorSubmitting || editorLoading) {
      return
    }

    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create styles.")
      return
    }

    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update styles.")
      return
    }

    const validationErrors = normalizeStyleFormErrors(values)

    if (validationErrors.length > 0) {
      setEditorErrors(validationErrors)
      toast.error("Please complete the required style fields.")
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
        await createStyle({
          apiUrl,
          accessToken: token,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Style created successfully.")
      } else if (editingId != null) {
        await updateStyle({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Style updated successfully.")
      }

      setEditorOpen(false)
      setEditorValues(DEFAULT_FORM_VALUES)
      setSelectedBuyer(null)
      setSelectedCurrency(null)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the style right now."

      if (!handleAuthFailure(message)) {
        setEditorErrors([{ section: "basic-info", message }])
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  async function confirmSoftDelete() {
    if (!deleteTarget || deleteWorking) {
      return
    }

    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete styles.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteStyle({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })

      setRecentlyDeletedStyle(deleteTarget)
      setDeleteTarget(null)
      toast.success("Style moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the style right now."

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
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (pendingActionMode === "restore") {
        if (!accessRules?.canUpdate) {
          toast.error("You do not have permission to restore styles.")
          return
        }

        await restoreStyle({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Style restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete styles.")
          return
        }

        await permanentlyDeleteStyle({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Style deleted permanently.")
      }

      if (recentlyDeletedStyle?.id === pendingActionTarget.id) {
        setRecentlyDeletedStyle(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedStyles.length
  const activeTotal = meta?.total ?? styles.length

  if (
    (loadingAccessRules || loadingStyles) &&
    styles.length === 0 &&
    (loadingAccessRules || loadingDeletedStyles) &&
    deletedStyles.length === 0 &&
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
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Merchandising
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Styles
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising style master data.
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
          title="Style access unavailable"
          description={accessError || "You do not have permission to view the Styles menu for the selected organization."}
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
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Merchandising
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Styles
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising style master data.
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
          title="Unable to load styles"
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
                    Merchandising master data
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Styles
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain style records for the selected organization.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Total {activeTotal}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Deleted {deletedTotal}
                    </Badge>
                    {recentlyDeletedStyle ? (
                      <Badge variant="destructive" className="rounded-full px-3 py-1">
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
                      New style
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedStyle ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted style
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getStyleLabel(recentlyDeletedStyle)} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() =>
                          openPendingActionDialog(recentlyDeletedStyle, "restore")
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
                          openPendingActionDialog(recentlyDeletedStyle, "permanent")
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

          <ActiveStylesSection
            styles={styles}
            meta={meta}
            page={page}
            limit={limit}
            loadingStyles={loadingStyles}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            buyerOptions={buyerOptions}
            loadBuyerOptions={loadBuyerOptions}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateStyle={openCreateDialog}
            onEditStyle={openEditDialog}
            onDeleteStyle={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            canCreateStyle={Boolean(accessRules?.canCreate)}
            canUpdateStyle={Boolean(accessRules?.canUpdate)}
            canDeleteStyle={Boolean(accessRules?.canDelete)}
            downloadingTemplate={false}
            uploadingTemplate={false}
          />

          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => void uploadTemplate(event.target.files?.[0])}
          />

          {accessRules?.canView ? (
            <DeletedStylesSection
              deletedStyles={deletedStyles}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedStyles={loadingDeletedStyles}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              buyerOptions={buyerOptions}
              loadBuyerOptions={loadBuyerOptions}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreStyle={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteStyle={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <StyleFormDialog
        key={`${editorOpen ? "open" : "closed"}-${editorMode}-${editingId ?? "new"}`}
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        values={editorValues}
        errors={editorErrors}
        selectedBuyer={selectedBuyer}
        selectedCurrency={selectedCurrency}
        loadBuyerOptions={loadBuyerOptions}
        loadCurrencyOptions={loadCurrencyOptions}
        loadColorOptions={loadColorOptions}
        loadSizeOptions={loadSizeOptions}
        loadEmbellishmentOptions={loadEmbellishmentOptions}
        onBuyerOptionChange={setSelectedBuyer}
        onCurrencyOptionChange={setSelectedCurrency}
        onValuesChange={setEditorValues}
        onOpenChange={(open) => {
          setEditorOpen(open)

          if (!open) {
            setEditorValues(DEFAULT_FORM_VALUES)
            setSelectedBuyer(null)
            setSelectedCurrency(null)
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
        style={deleteTarget}
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
        style={pendingActionTarget}
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
