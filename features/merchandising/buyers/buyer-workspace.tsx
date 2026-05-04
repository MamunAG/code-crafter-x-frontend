"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, RefreshCcw, Trash2, Undo2, Users } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { type AppComboboxLoadParams, type AppComboboxOption } from "@/components/app-combobox"
import { createCountry, fetchCountries } from "@/features/app-config/countries/country.service"
import type { CountryRecord } from "@/features/app-config/countries/country.types"

import { BuyerFormDialog } from "./component/buyer-form-dialog"
import { ActiveBuyersSection } from "./component/active-buyers-section"
import { DeletedBuyersSection } from "./component/deleted-buyers-section"
import {
  BuyerUploadReportError,
  createBuyer,
  downloadBuyerUploadTemplate,
  fetchBuyer,
  fetchBuyers,
  permanentlyDeleteBuyer,
  restoreBuyer,
  softDeleteBuyer,
  updateBuyer,
  uploadBuyerTemplate,
} from "./buyer.service"
import type { BuyerFilterValues, BuyerFormValues, BuyerRecord, BuyerUploadReport, PaginationMeta } from "./buyer.types"

type BuyerEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type BuyerAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

type CountryOption = CountryRecord & AppComboboxOption

type MissingBuyerSetupItem = {
  kind: "country"
  label: string
  value: string
}

const BUYER_MENU_NAME = "Buyer Setup"
const EMPTY_ACCESS_RULES: BuyerAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: BuyerFilterValues = {
  name: "",
  displayName: "",
  contact: "",
  email: "",
  countryId: "",
  address: "",
  isActive: "",
  remarks: "",
}

const DEFAULT_FORM_VALUES: BuyerFormValues = {
  name: "",
  displayName: "",
  contact: "",
  email: "",
  countryId: "",
  address: "",
  remarks: "",
  isActive: true,
}

function getBuyerLabel(buyer: BuyerRecord) {
  return buyer.displayName?.trim() || buyer.name
}

function normalizeAuthFailure(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized")
  )
}

function getMissingBuyerSetupKey(item: MissingBuyerSetupItem) {
  return `${item.kind}:${item.value.trim().toLowerCase()}`
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

function BuyerSectionSkeleton({ deleted = false }: { deleted?: boolean }) {
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

          <BuyerSectionSkeleton />
          <BuyerSectionSkeleton deleted />
        </div>
      </ScrollArea>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  buyer,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  buyer: BuyerRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete buyer</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {buyer ? getBuyerLabel(buyer) : "this buyer"}
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
  buyer,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  buyer: BuyerRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore buyer" : "Delete buyer permanently"
  const description =
    action === "restore"
      ? "Bring this buyer back into the active merchandising list."
      : "This will permanently remove the buyer record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {buyer ? getBuyerLabel(buyer) : "this buyer"}
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

function MissingBuyerSetupSection({
  items,
  savingKeys,
  savedKeys,
  errors,
  onSave,
}: {
  items: MissingBuyerSetupItem[]
  savingKeys: Set<string>
  savedKeys: Set<string>
  errors: Record<string, string>
  onSave: (item: MissingBuyerSetupItem) => void
}) {
  if (!items.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Countries to add first</p>
        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
          {items.length} missing
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const key = getMissingBuyerSetupKey(item)
          const saving = savingKeys.has(key)
          const saved = savedKeys.has(key)
          const error = errors[key]

          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-950 dark:text-slate-50">{item.value}</p>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                      {item.label}
                    </Badge>
                  </div>
                  {error ? <p className="mt-1 text-xs leading-5 text-destructive">{error}</p> : null}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={saved ? "outline" : "default"}
                  className="h-8 rounded-xl"
                  disabled={saving || saved}
                  onClick={() => onSave(item)}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {saved ? <Check className="size-3.5" /> : null}
                  {saved ? "Saved" : "Save"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BuyerUploadReportDialog({
  open,
  report,
  savingKeys,
  savedKeys,
  errors,
  onOpenChange,
  onSaveMissingSetup,
}: {
  open: boolean
  report: BuyerUploadReport | null
  savingKeys: Set<string>
  savedKeys: Set<string>
  errors: Record<string, string>
  onOpenChange: (open: boolean) => void
  onSaveMissingSetup: (item: MissingBuyerSetupItem) => void
}) {
  const countryItems = (report?.missing?.countries ?? []).map((value) => ({
    kind: "country" as const,
    label: "Country",
    value,
  }))
  const allItemsSaved =
    countryItems.length > 0 && countryItems.every((item) => savedKeys.has(getMissingBuyerSetupKey(item)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buyer upload report</DialogTitle>
          <DialogDescription>
            The upload was stopped because required setup data is missing. Add the missing records,
            then upload the template again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Inserted</p>
              <p className="mt-1 text-xl font-semibold">{report?.inserted ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Skipped</p>
              <p className="mt-1 text-xl font-semibold">{report?.skipped ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Missing setup</p>
              <p className="mt-1 text-xl font-semibold">{countryItems.length}</p>
            </div>
          </div>

          <MissingBuyerSetupSection
            items={countryItems}
            savingKeys={savingKeys}
            savedKeys={savedKeys}
            errors={errors}
            onSave={onSaveMissingSetup}
          />

          {allItemsSaved ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              All missing setup records have been saved. Please upload the buyer template again.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BuyerWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingBuyers, setLoadingBuyers] = useState(true)
  const [loadingDeletedBuyers, setLoadingDeletedBuyers] = useState(true)
  const [countryLoading, setCountryLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [countryError, setCountryError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<BuyerAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")

  const [buyers, setBuyers] = useState<BuyerRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedBuyers, setDeletedBuyers] = useState<BuyerRecord[]>([])
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)
  const [countryOptions, setCountryOptions] = useState<CountryRecord[]>([])
  const [editorCountry, setEditorCountry] = useState<CountryOption | null>(null)

  const [draftFilters, setDraftFilters] = useState<BuyerFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<BuyerFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<BuyerFilterValues>(DEFAULT_FILTERS)
  const [deletedActiveFilters, setDeletedActiveFilters] = useState<BuyerFilterValues>(DEFAULT_FILTERS)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<BuyerEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<BuyerFormValues>(DEFAULT_FORM_VALUES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [uploadReport, setUploadReport] = useState<BuyerUploadReport | null>(null)
  const [uploadReportOpen, setUploadReportOpen] = useState(false)
  const [savingMissingSetupKeys, setSavingMissingSetupKeys] = useState<Set<string>>(() => new Set())
  const [savedMissingSetupKeys, setSavedMissingSetupKeys] = useState<Set<string>>(() => new Set())
  const [missingSetupErrors, setMissingSetupErrors] = useState<Record<string, string>>({})

  const [deleteTarget, setDeleteTarget] = useState<BuyerRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedBuyer, setRecentlyDeletedBuyer] = useState<BuyerRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<BuyerRecord | null>(null)
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
          menuName: BUYER_MENU_NAME,
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
            : "Unable to load your buyer menu access right now."

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

    async function loadCountries() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setCountryOptions([])
        setCountryError("")
        setCountryLoading(false)
        return
      }

      setCountryLoading(true)
      setCountryError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const pageSize = 100
        const countryPages: CountryRecord[] = []
        let currentPage = 1
        let hasNextPage = true

        while (hasNextPage) {
          const response = await fetchCountries({
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

          countryPages.push(...response.items)
          hasNextPage = response.meta.hasNextPage
          currentPage += 1
        }

        setCountryOptions(
          countryPages.filter((country) => country.deleted_at == null && country.isActive !== false),
        )
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load buyer countries right now."

        if (handleAuthFailure(message)) {
          return
        }

        setCountryError(message)
      } finally {
        if (active) {
          setCountryLoading(false)
        }
      }
    }

    void loadCountries()

    return () => {
      active = false
    }
  }, [
    accessRules?.canView,
    apiUrl,
    handleAuthFailure,
    loadingAccessRules,
    refreshVersion,
    selectedOrganizationId,
  ])

  const openEditDialog = useCallback(
    async (buyerId: string) => {
      if (!accessRules?.canUpdate) {
        toast.error("You do not have permission to update buyers.")
        return
      }

      setEditorMode("edit")
      setEditingId(buyerId)
      setEditorError("")
      setEditorSubmitting(false)
      setEditorLoading(true)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditorCountry(null)
      setEditorOpen(true)

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const record = await fetchBuyer({
          apiUrl,
          accessToken: token,
          id: buyerId,
          organizationId: selectedOrganizationId || undefined,
        })

        setEditorInitialValues({
          name: record.name ?? "",
          displayName: record.displayName ?? "",
          contact: record.contact ?? "",
          email: record.email ?? "",
          countryId: record.countryId ? String(record.countryId) : "",
          address: record.address ?? "",
          remarks: record.remarks ?? "",
          isActive: record.isActive !== false,
        })
        if (record.country?.id != null) {
          setEditorCountry({
            ...record.country,
            id: record.country.id,
            label: record.country.name ?? "",
            value: String(record.country.id),
          } as CountryOption)
        } else {
          setEditorCountry(null)
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the buyer record right now."

        if (!handleAuthFailure(message)) {
          setEditorError(message)
          toast.error(message)
        }
      } finally {
        setEditorLoading(false)
      }
    },
    [accessRules?.canUpdate, apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadBuyerCountries = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchCountries({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { name: query },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items
          .filter((country) => country.deleted_at == null && country.isActive !== false)
          .map<CountryOption>((country) => ({
            ...country,
            label: country.name ?? "",
            value: String(country.id),
          })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const openPendingActionDialog = useCallback(
    (buyer: BuyerRecord, mode: PendingDeleteMode) => {
      if (mode === "restore" && !accessRules?.canUpdate) {
        toast.error("You do not have permission to restore buyers.")
        return
      }

      if (mode === "permanent" && !accessRules?.canDelete) {
        toast.error("You do not have permission to permanently delete buyers.")
        return
      }

      setPendingActionTarget(buyer)
      setPendingActionMode(mode)
    },
    [accessRules?.canDelete, accessRules?.canUpdate],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadBuyers() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setBuyers([])
        setMeta(null)
        setLoadingBuyers(false)
        return
      }

      setLoadingBuyers(true)
      setError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchBuyers({
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

        setBuyers(response.items)
        setMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load buyers right now."

        if (handleAuthFailure(message)) {
          return
        }

        setError(message)
      } finally {
        if (active) {
          setLoadingBuyers(false)
        }
      }
    }

    void loadBuyers()

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

    async function loadDeletedBuyers() {
      if (loadingAccessRules) {
        return
      }

      if (!accessRules?.canView) {
        setDeletedBuyers([])
        setDeletedMeta(null)
        setLoadingDeletedBuyers(false)
        return
      }

      setLoadingDeletedBuyers(true)
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchBuyers({
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

        setDeletedBuyers(response.items)
        setDeletedMeta(response.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load deleted buyers right now."

        if (handleAuthFailure(message)) {
          return
        }

        setDeletedError(message)
      } finally {
        if (active) {
          setLoadingDeletedBuyers(false)
        }
      }
    }

    void loadDeletedBuyers()

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
    () => buyers.filter((buyer) => buyer.isActive !== false && !buyer.deleted_at).length,
    [buyers],
  )

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  function resetMissingSetupSaveState() {
    setSavingMissingSetupKeys(new Set())
    setSavedMissingSetupKeys(new Set())
    setMissingSetupErrors({})
  }

  async function saveMissingSetupItem(item: MissingBuyerSetupItem) {
    const key = getMissingBuyerSetupKey(item)

    if (savingMissingSetupKeys.has(key) || savedMissingSetupKeys.has(key)) {
      return
    }

    const token = window.localStorage.getItem("access_token")

    if (!token) {
      handleAuthFailure("Your session expired. Please sign in again.")
      return
    }

    setSavingMissingSetupKeys((current) => new Set(current).add(key))
    setMissingSetupErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })

    try {
      await createCountry({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
        payload: {
          name: item.value,
          isActive: true,
        },
      })

      setSavedMissingSetupKeys((current) => new Set(current).add(key))
      toast.success(`${item.label} "${item.value}" saved successfully.`)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to save ${item.label.toLowerCase()} "${item.value}" right now.`

      if (!handleAuthFailure(message)) {
        setMissingSetupErrors((current) => ({ ...current, [key]: message }))
        toast.error(message)
      }
    } finally {
      setSavingMissingSetupKeys((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }

  function resetActiveFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setActiveFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function openCreateDialog() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create buyers.")
      return
    }

    setEditorMode("create")
    setEditingId(null)
    setEditorError("")
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorCountry(null)
    setEditorLoading(false)
    setEditorSubmitting(false)
    setEditorOpen(true)
  }

  async function downloadTemplate() {
    if (!accessRules?.canCreate || downloadingTemplate) {
      if (!accessRules?.canCreate) {
        toast.error("You do not have permission to download the buyer template.")
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

      const blob = await downloadBuyerUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId || undefined,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "buyer-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to download the buyer template right now."

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
      toast.error("You do not have permission to upload buyers.")
      return
    }

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadBuyerTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId || undefined,
      })

      toast.success(
        `Buyer upload completed. ${result.inserted} inserted, ${result.skipped} already existed.`,
      )
      triggerRefresh()
    } catch (caughtError) {
      if (caughtError instanceof BuyerUploadReportError) {
        resetMissingSetupSaveState()
        setUploadReport(caughtError.report)
        setUploadReportOpen(true)

        if (!handleAuthFailure(caughtError.message)) {
          toast.error(caughtError.message)
        }

        return
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload the buyer template right now."

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

  function requestSoftDelete(buyer: BuyerRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete buyers.")
      return
    }

    setDeleteTarget(buyer)
  }

  async function submitEditor(values: BuyerFormValues) {
    if (editorSubmitting || editorLoading) {
      return
    }

    if (editorMode === "create" && !accessRules?.canCreate) {
      toast.error("You do not have permission to create buyers.")
      return
    }

    if (editorMode === "edit" && !accessRules?.canUpdate) {
      toast.error("You do not have permission to update buyers.")
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
        await createBuyer({
          apiUrl,
          accessToken: token,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Buyer created successfully.")
      } else if (editingId != null) {
        await updateBuyer({
          apiUrl,
          accessToken: token,
          id: editingId,
          payload: values,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Buyer updated successfully.")
      }

      setEditorOpen(false)
      setEditorInitialValues(DEFAULT_FORM_VALUES)
      setEditingId(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the buyer right now."

      if (!handleAuthFailure(message)) {
        setEditorError(message)
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
      toast.error("You do not have permission to delete buyers.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteBuyer({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId || undefined,
      })

      setRecentlyDeletedBuyer(deleteTarget)
      setDeleteTarget(null)
      toast.success("Buyer moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the buyer right now."

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
          toast.error("You do not have permission to restore buyers.")
          return
        }

        await restoreBuyer({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Buyer restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete buyers.")
          return
        }

        await permanentlyDeleteBuyer({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Buyer deleted permanently.")
      }

      if (recentlyDeletedBuyer?.id === pendingActionTarget.id) {
        setRecentlyDeletedBuyer(null)
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

  const deletedTotal = deletedMeta?.total ?? deletedBuyers.length
  const activeTotal = meta?.total ?? buyers.length

  if (
    (loadingAccessRules || loadingBuyers) &&
    buyers.length === 0 &&
    (loadingAccessRules || loadingDeletedBuyers) &&
    deletedBuyers.length === 0 &&
    !error &&
    !deletedError &&
    !accessError &&
    !countryLoading &&
    !countryError
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
                  Buyers
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising buyer master data.
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
          title="Buyer access unavailable"
          description={accessError || "You do not have permission to view the Buyers menu for the selected organization."}
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
                  Buyers
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage merchandising buyer master data.
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
          title="Unable to load buyers"
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
                    Buyers
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain buyer records for the selected organization.
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
                    {recentlyDeletedBuyer ? (
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
                      New buyer
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedBuyer ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted buyer
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getBuyerLabel(recentlyDeletedBuyer)} was soft deleted and can still be restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() =>
                          openPendingActionDialog(recentlyDeletedBuyer, "restore")
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
                          openPendingActionDialog(recentlyDeletedBuyer, "permanent")
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

          <ActiveBuyersSection
            buyers={buyers}
            meta={meta}
            page={page}
            limit={limit}
            loadingBuyers={loadingBuyers}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            countryOptions={countryOptions}
            loadCountryOptions={loadBuyerCountries}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateBuyer={openCreateDialog}
            onEditBuyer={openEditDialog}
            onDeleteBuyer={requestSoftDelete}
            onResetFilters={resetActiveFilters}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            canCreateBuyer={Boolean(accessRules?.canCreate)}
            canUpdateBuyer={Boolean(accessRules?.canUpdate)}
            canDeleteBuyer={Boolean(accessRules?.canDelete)}
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

          {accessRules?.canView ? (
            <DeletedBuyersSection
              deletedBuyers={deletedBuyers}
              deletedMeta={deletedMeta}
              deletedPage={deletedPage}
              deletedLimit={deletedLimit}
              loadingDeletedBuyers={loadingDeletedBuyers}
              deletedError={deletedError}
              deletedDraftFilters={deletedDraftFilters}
              deletedActiveFilters={deletedActiveFilters}
              countryOptions={countryOptions}
              loadCountryOptions={loadBuyerCountries}
              onDeletedDraftFiltersChange={setDeletedDraftFilters}
              onDeletedActiveFiltersChange={setDeletedActiveFilters}
              onDeletedPageChange={setDeletedPage}
              onDeletedLimitChange={setDeletedLimit}
              onOpenAction={openPendingActionDialog}
              canRestoreBuyer={Boolean(accessRules?.canUpdate)}
              canPermanentlyDeleteBuyer={Boolean(accessRules?.canDelete)}
            />
          ) : null}
        </div>
      </ScrollArea>

      <BuyerFormDialog
        key={`${editorOpen ? "open" : "closed"}-${editorMode}-${editorCountry?.value ?? "none"}`}
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        initialCountry={editorCountry}
        loadCountryOptions={loadBuyerCountries}
        initialValues={editorInitialValues}
        onOpenChange={(open) => {
          setEditorOpen(open)

          if (!open) {
            setEditorInitialValues(DEFAULT_FORM_VALUES)
            setEditorCountry(null)
            setEditorError("")
            setEditorLoading(false)
            setEditorSubmitting(false)
            setEditingId(null)
          }
        }}
        onSubmit={submitEditor}
      />

      <BuyerUploadReportDialog
        open={uploadReportOpen}
        report={uploadReport}
        savingKeys={savingMissingSetupKeys}
        savedKeys={savedMissingSetupKeys}
        errors={missingSetupErrors}
        onSaveMissingSetup={saveMissingSetupItem}
        onOpenChange={(open) => {
          setUploadReportOpen(open)

          if (!open) {
            setUploadReport(null)
            resetMissingSetupSaveState()
          }
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        buyer={deleteTarget}
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
        buyer={pendingActionTarget}
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
