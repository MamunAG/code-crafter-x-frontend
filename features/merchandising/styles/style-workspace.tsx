"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Edit3,
  Info,
  Loader2,
  MessageSquare,
  Palette,
  Plus,
  RefreshCcw,
  RotateCcw,
  Ruler,
  Search,
  Settings,
  Shirt,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxOption } from "@/components/app-combobox"
import { AppSelect } from "@/components/app-select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { fetchCurrencies } from "@/features/app-config/currencies/currency.service"
import type { CurrencyRecord } from "@/features/app-config/currencies/currency.types"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { fetchBuyers } from "@/features/merchandising/buyers/buyer.service"
import type { BuyerRecord } from "@/features/merchandising/buyers/buyer.types"
import { fetchColors } from "@/features/merchandising/colors/color.service"
import type { ColorRecord } from "@/features/merchandising/colors/color.types"
import { fetchEmbellishments } from "@/features/merchandising/embellishments/embellishment.service"
import type { EmbellishmentRecord } from "@/features/merchandising/embellishments/embellishment.types"
import { fetchSizes } from "@/features/merchandising/sizes/size.service"
import type { SizeRecord } from "@/features/merchandising/sizes/size.types"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"
import { cn } from "@/lib/utils"

import {
  createStyle,
  fetchStyle,
  fetchStyles,
  permanentlyDeleteStyle,
  restoreStyle,
  softDeleteStyle,
  updateStyle,
} from "./style.service"
import type {
  PaginationMeta,
  StyleChildOptionValue,
  StyleFilterValues,
  StyleFormError,
  StyleFormValues,
  StyleRecord,
} from "./style.types"

type StyleAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

type StyleEditorMode = "create" | "edit"
type PendingAction = "soft-delete" | "restore" | "permanent"
type SelectOption = AppComboboxOption
type StyleDialogSectionId =
  | "basic-info"
  | "production-smv"
  | "colors"
  | "sizes"
  | "embellishments"
  | "remarks-status"

const STYLE_MENU_NAME = "Style Setup"
const PAGE_SIZE = 10
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

const STYLE_DIALOG_INPUT_CLASS = "w-full min-w-0"
const STYLE_DIALOG_FIELD_CLASS = "min-w-0 space-y-2"

const STYLE_DIALOG_SECTIONS: Array<{
  id: StyleDialogSectionId
  label: string
  icon: typeof Info
}> = [
    { id: "basic-info", label: "Basic Info", icon: Info },
    { id: "production-smv", label: "Production / SMV", icon: Settings },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "sizes", label: "Sizes", icon: Ruler },
    { id: "embellishments", label: "Embellishments", icon: Sparkles },
    { id: "remarks-status", label: "Remarks / Status", icon: MessageSquare },
  ]

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return typeof error === "string" ? error : "Something went wrong. Please try again."
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function formatUser(user?: { display_name?: string | null; name?: string | null; user_name?: string | null } | null) {
  return user?.display_name || user?.name || user?.user_name || "-"
}

function getBuyerLabel(buyer?: BuyerRecord | StyleRecord["buyer"] | null) {
  return buyer?.displayName?.trim() || buyer?.name?.trim() || "-"
}

function getCurrencyLabel(currency?: CurrencyRecord | StyleRecord["currency"] | null) {
  const code = currency?.currencyCode?.trim()
  const name = currency?.currencyName?.trim()
  const symbol = currency?.symbol?.trim()

  return [code, name].filter(Boolean).join(" - ") || symbol || "-"
}

function getColorLabel(color?: unknown) {
  if (!color || typeof color !== "object") {
    return "-"
  }

  const nextColor = color as { colorDisplayName?: string | null; colorName?: string | null }
  return nextColor.colorDisplayName?.trim() || nextColor.colorName?.trim() || "-"
}

function getSizeLabel(size?: SizeRecord | null) {
  return size?.sizeName?.trim() || "-"
}

function getEmbellishmentLabel(embellishment?: EmbellishmentRecord | null) {
  return embellishment?.name?.trim() || "-"
}

function toOption(label: string, value: string): SelectOption {
  return { label, value }
}

function mapBuyerOption(buyer: BuyerRecord): SelectOption {
  return toOption(getBuyerLabel(buyer), buyer.id)
}

function mapCurrencyOption(currency: CurrencyRecord): SelectOption {
  return toOption(getCurrencyLabel(currency), String(currency.id))
}

function mapColorOption(color: ColorRecord): SelectOption {
  return toOption(getColorLabel(color), String(color.id))
}

function mapSizeOption(size: SizeRecord): SelectOption {
  return toOption(getSizeLabel(size), String(size.id))
}

function mapEmbellishmentOption(embellishment: EmbellishmentRecord): SelectOption {
  return toOption(getEmbellishmentLabel(embellishment), String(embellishment.id))
}

function styleToFormValues(style: StyleRecord): StyleFormValues {
  return {
    productType: style.productType ?? "",
    buyerId: style.buyerId ?? "",
    styleNo: style.styleNo ?? "",
    styleName: style.styleName ?? "",
    itemType: style.itemType ?? "",
    productDepartment: style.productDepartment ?? "",
    cmSewing: String(style.cmSewing ?? 0),
    currencyId: style.currencyId ? String(style.currencyId) : "",
    smvSewing: String(style.smvSewing ?? 0),
    smvSewingSideSeam: String(style.smvSewingSideSeam ?? 0),
    smvCutting: String(style.smvCutting ?? 0),
    smvCuttingSideSeam: String(style.smvCuttingSideSeam ?? 0),
    smvFinishing: String(style.smvFinishing ?? 0),
    imageId: style.imageId ? String(style.imageId) : "",
    remarks: style.remarks ?? "",
    isActive: style.isActive !== false,
    itemUom: style.itemUom ?? "",
    productFamily: style.productFamily ?? "",
    colors:
      style.styleToColorMaps?.map((item) => ({
        id: crypto.randomUUID(),
        value: String(item.colorId),
        label: getColorLabel(item.color ?? null),
      })) ?? [],
    sizes:
      style.styleToSizeMaps?.map((item) => ({
        id: crypto.randomUUID(),
        value: String(item.sizeId),
        label: item.size?.sizeName ?? `Size #${item.sizeId}`,
      })) ?? [],
    embellishments:
      style.styleToEmbellishmentMaps?.map((item) => ({
        id: crypto.randomUUID(),
        value: String(item.embellishmentId),
        label: item.embellishment?.name ?? `Embellishment #${item.embellishmentId}`,
      })) ?? [],
  }
}

function validateForm(values: StyleFormValues) {
  const errors: Array<{ message: string; section: StyleDialogSectionId }> = []

  if (!values.styleNo.trim()) errors.push({ message: "Style No is required.", section: "basic-info" })
  if (!values.buyerId.trim()) errors.push({ message: "Buyer is required.", section: "basic-info" })
  if (!values.currencyId.trim()) errors.push({ message: "Currency is required.", section: "basic-info" })

  const numericFields: Array<[keyof StyleFormValues, string]> = [
    ["cmSewing", "CM sewing"],
    ["smvSewing", "SMV sewing"],
    ["smvSewingSideSeam", "SMV sewing side seam"],
    ["smvCutting", "SMV cutting"],
    ["smvCuttingSideSeam", "SMV cutting side seam"],
    ["smvFinishing", "SMV finishing"],
  ]

  numericFields.forEach(([field, label]) => {
    const value = String(values[field]).trim()
    if (value && Number.isNaN(Number(value))) {
      errors.push({ message: `${label} must be a valid number.`, section: "production-smv" })
    }
  })

  const duplicateGroups: Array<[StyleChildOptionValue[], string, StyleDialogSectionId]> = [
    [values.colors, "color", "colors"],
    [values.sizes, "size", "sizes"],
    [values.embellishments, "embellishment", "embellishments"],
  ]

  duplicateGroups.forEach(([items, label, section]) => {
    const valuesSet = new Set<string>()
    items.forEach((item) => {
      if (!item.value) {
        errors.push({ message: `Every ${label} row must have a selected value.`, section })
      }

      if (valuesSet.has(item.value)) {
        errors.push({ message: `Duplicate ${label} rows are not allowed.`, section })
      }

      valuesSet.add(item.value)
    })
  })

  return errors
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <Shirt className="size-8 text-slate-400" />
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}

function PageSkeleton() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </ScrollArea>
  )
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  )
}

function ChildMappingCard({
  sectionId,
  sectionRef,
  title,
  addLabel,
  placeholder,
  values,
  loadItems,
  onChange,
}: {
  sectionId: StyleDialogSectionId
  sectionRef: (element: HTMLElement | null) => void
  title: string
  addLabel: string
  placeholder: string
  values: StyleChildOptionValue[]
  loadItems: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  onChange: (values: StyleChildOptionValue[]) => void
}) {
  const [openRowId, setOpenRowId] = useState("")

  function addRow() {
    onChange([...values, { id: crypto.randomUUID(), value: "", label: "" }])
  }

  function removeRow(id: string) {
    onChange(values.filter((item) => item.id !== id))
  }

  function updateRow(id: string, option: SelectOption | null) {
    onChange(
      values.map((item) =>
        item.id === id
          ? {
            ...item,
            value: option?.value ?? "",
            label: option?.label ?? "",
          }
          : item,
      ),
    )
  }

  return (
    <Card
      id={sectionId}
      ref={sectionRef}
      className="scroll-mt-32 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80 lg:scroll-mt-3"
    >
      <CardHeader className="border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Button type="button" variant="outline" size="sm" className="h-8 w-full rounded-md border-blue-500/60 px-2 text-xs text-blue-600 dark:text-blue-300 sm:h-7 sm:w-auto" onClick={addRow}>
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-3">
        <div className="overflow-x-auto rounded-md border border-slate-200/70 dark:border-white/10">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="h-8 hover:bg-transparent">
                <TableHead className="h-8 w-12 text-xs">#</TableHead>
                <TableHead className="h-8 text-xs">{title.replace(" mappings", "")}</TableHead>
                <TableHead className="h-8 text-xs">Code</TableHead>
                <TableHead className="h-8 text-xs">Display Name</TableHead>
                <TableHead className="h-8 text-xs">Status</TableHead>
                <TableHead className="h-8 w-24 text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {values.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-14 text-center text-xs text-slate-500 dark:text-slate-400">
                    No rows added yet.
                  </TableCell>
                </TableRow>
              ) : (
                values.map((item, index) => (
                  <TableRow key={item.id} className="h-9">
                    <TableCell className="py-1 text-xs">{index + 1}</TableCell>
                    <TableCell className="min-w-56 py-1">
                      <AppCombobox
                        open={openRowId === item.id}
                        onOpenChange={(open) => setOpenRowId(open ? item.id : "")}
                        value={item.value ? { value: item.value, label: item.label } : null}
                        onValueChange={(option) => {
                          updateRow(item.id, option)
                          setOpenRowId("")
                        }}
                        loadItems={loadItems}
                        initialLimit={10}
                        searchLimit={10}
                        placeholder={placeholder}
                        loadingMessage="Loading options..."
                        emptyMessage="No matching options found."
                        showClear={Boolean(item.value)}
                        inputClassName="h-7 rounded-md text-xs"
                        contentClassName="rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="py-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.value ? `#${item.value}` : "-"}
                    </TableCell>
                    <TableCell className="py-1 text-xs">{item.label || "-"}</TableCell>
                    <TableCell className="py-1">
                      <Badge className="rounded-full bg-emerald-600/15 px-2 py-0 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-600/15 dark:text-emerald-300">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <Button type="button" variant="ghost" size="icon" className="size-7 rounded-md text-red-500 hover:text-red-600" onClick={() => removeRow(item.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function DialogRailItem({
  icon: Icon,
  label,
  active = false,
  count,
  hasError = false,
  onClick,
}: {
  icon: typeof Info
  label: string
  active?: boolean
  count?: number
  hasError?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-600 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-slate-300",
        active
          ? "border-l-2 border-blue-500 bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          : "hover:bg-slate-900/5 dark:hover:bg-white/[0.04]",
        hasError && !active ? "text-red-600 dark:text-red-300" : "",
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hasError ? (
        <span className="size-2 rounded-full bg-red-500" aria-label={`${label} has validation errors`} />
      ) : null}
      {typeof count === "number" ? (
        <Badge className="rounded-md bg-blue-600/15 px-2 py-0 text-xs text-blue-700 hover:bg-blue-600/15 dark:text-blue-200">
          {count}
        </Badge>
      ) : null}
    </button>
  )
}

function StyleEntryDialog({
  open,
  mode,
  loading,
  submitting,
  values,
  errors,
  selectedBuyer,
  selectedCurrency,
  loadBuyerOptions,
  loadCurrencyOptions,
  loadColorOptions,
  loadSizeOptions,
  loadEmbellishmentOptions,
  onBuyerOptionChange,
  onCurrencyOptionChange,
  onValuesChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  mode: StyleEditorMode
  loading: boolean
  submitting: boolean
  values: StyleFormValues
  errors: StyleFormError[]
  selectedBuyer: SelectOption | null
  selectedCurrency: SelectOption | null
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadCurrencyOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadColorOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadSizeOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadEmbellishmentOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  onBuyerOptionChange: (option: SelectOption | null) => void
  onCurrencyOptionChange: (option: SelectOption | null) => void
  onValuesChange: (values: StyleFormValues) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}) {
  const [buyerOpen, setBuyerOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<StyleDialogSectionId>("basic-info")
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<StyleDialogSectionId, HTMLElement | null>>({
    "basic-info": null,
    "production-smv": null,
    colors: null,
    sizes: null,
    embellishments: null,
    "remarks-status": null,
  })
  const errorSectionSet = useMemo(
    () => new Set(errors.map((error) => error.section)),
    [errors],
  )

  function update<K extends keyof StyleFormValues>(field: K, value: StyleFormValues[K]) {
    onValuesChange({ ...values, [field]: value })
  }

  const setSectionRef = useCallback(
    (sectionId: StyleDialogSectionId) => (element: HTMLElement | null) => {
      sectionRefs.current[sectionId] = element
    },
    [],
  )

  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current

    if (!viewport) {
      return
    }

    const viewportTop = viewport.getBoundingClientRect().top
    let nextActiveSection: StyleDialogSectionId = "basic-info"
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const section of STYLE_DIALOG_SECTIONS) {
      const element = sectionRefs.current[section.id]

      if (!element) {
        continue
      }

      const distance = Math.abs(element.getBoundingClientRect().top - viewportTop - 12)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nextActiveSection = section.id
      }
    }

    setActiveSection((currentSection) => (currentSection === nextActiveSection ? currentSection : nextActiveSection))
  }, [])

  function scrollToSection(sectionId: StyleDialogSectionId) {
    const element = sectionRefs.current[sectionId]

    if (!element) {
      return
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(sectionId)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setActiveSection("basic-info")
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-slate-200/70 bg-slate-50 p-0 shadow-2xl dark:border-white/10 dark:bg-[#080a14] sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-7xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] sm:max-h-[calc(100vh-2rem)] sm:min-h-[78vh]">
          <div className="grid min-h-0 lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-[#0a0d19]/90 lg:block">
              <nav className="space-y-2">
                {STYLE_DIALOG_SECTIONS.map((section) => (
                  <DialogRailItem
                    key={section.id}
                    icon={section.icon}
                    label={section.label}
                    active={activeSection === section.id}
                    count={
                      section.id === "colors"
                        ? values.colors.length
                        : section.id === "sizes"
                          ? values.sizes.length
                          : section.id === "embellishments"
                            ? values.embellishments.length
                            : undefined
                    }
                    hasError={errorSectionSet.has(section.id)}
                    onClick={() => scrollToSection(section.id)}
                  />
                ))}
              </nav>
            </aside>

            <ScrollArea className="min-h-0" viewportRef={scrollViewportRef} onScrollCapture={handleScroll}>
              <div className="space-y-2.5 p-2 sm:p-3">
                <div className="sr-only">
                  <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Create style" : "Edit style"}</DialogTitle>
                    <DialogDescription>
                      Manage the parent style information and the color, size, and embellishment mappings.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="sticky top-0 z-20 -mx-2 -mt-2 w-screen max-w-none overflow-hidden rounded-none border-b border-slate-200/70 bg-white/95 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-[#17131d]/95 dark:shadow-[0_14px_30px_rgba(0,0,0,0.35)] sm:mx-0 sm:mt-0 sm:w-full sm:max-w-full sm:rounded-lg sm:border lg:hidden">
                  <DialogHeader className="min-w-0">
                    <DialogTitle className="text-base">{mode === "create" ? "Create style" : "Edit style"}</DialogTitle>
                  </DialogHeader>
                  <div className="-mx-1 mt-3 flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {STYLE_DIALOG_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "flex max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
                          activeSection === section.id
                            ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300",
                          errorSectionSet.has(section.id) ? "border-red-400 text-red-600 dark:text-red-300" : "",
                        )}
                      >
                        <section.icon className="size-3.5" />
                        <span className="truncate">{section.label}</span>
                        {section.id === "colors" || section.id === "sizes" || section.id === "embellishments" ? (
                          <Badge className="rounded-md bg-blue-600/15 px-1.5 py-0 text-[10px] text-blue-700 hover:bg-blue-600/15 dark:text-blue-200">
                            {section.id === "colors"
                              ? values.colors.length
                              : section.id === "sizes"
                                ? values.sizes.length
                                : values.embellishments.length}
                          </Badge>
                        ) : null}
                        {errorSectionSet.has(section.id) ? <span className="size-1.5 rounded-full bg-red-500" /> : null}
                      </button>
                    ))}
                  </div>
                </div>

                {errors.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    <p className="font-medium">Please fix the following:</p>
                    <ul className="mt-1 space-y-1">
                      {errors.map((error) => (
                        <li key={`${error.section}-${error.message}`}>{error.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Card
                      id="basic-info"
                      ref={setSectionRef("basic-info")}
                      className="scroll-mt-32 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80 lg:scroll-mt-3"
                    >
                      <CardHeader className="px-4 pb-2 pt-3">
                        <CardTitle className="text-sm">Basic Info</CardTitle>
                      </CardHeader>
                      <CardContent className="grid min-w-0 gap-4 px-3 pb-3 sm:px-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel required>Style No</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.styleNo} onChange={(event) => update("styleNo", event.target.value)} placeholder="Input style no" />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Style Name</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.styleName} onChange={(event) => update("styleName", event.target.value)} placeholder="Input style name" />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel required>Buyer</FieldLabel>
                          <AppCombobox
                            open={buyerOpen}
                            onOpenChange={setBuyerOpen}
                            value={selectedBuyer}
                            onValueChange={(option) => {
                              onBuyerOptionChange(option)
                              update("buyerId", option?.value ?? "")
                              setBuyerOpen(false)
                            }}
                            loadItems={loadBuyerOptions}
                            initialLimit={10}
                            searchLimit={10}
                            placeholder="Search buyer"
                            showClear={Boolean(values.buyerId)}
                            inputClassName={STYLE_DIALOG_INPUT_CLASS}
                            contentClassName="rounded-lg"
                          />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel required>Currency</FieldLabel>
                          <AppCombobox
                            open={currencyOpen}
                            onOpenChange={setCurrencyOpen}
                            value={selectedCurrency}
                            onValueChange={(option) => {
                              onCurrencyOptionChange(option)
                              update("currencyId", option?.value ?? "")
                              setCurrencyOpen(false)
                            }}
                            loadItems={loadCurrencyOptions}
                            initialLimit={10}
                            searchLimit={10}
                            placeholder="Search currency"
                            showClear={Boolean(values.currencyId)}
                            inputClassName={STYLE_DIALOG_INPUT_CLASS}
                            contentClassName="rounded-lg"
                          />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Product Type</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.productType} onChange={(event) => update("productType", event.target.value)} placeholder="Input product type" />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Item Type</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.itemType} onChange={(event) => update("itemType", event.target.value)} placeholder="Input item type" />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Product Department</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.productDepartment} onChange={(event) => update("productDepartment", event.target.value)} placeholder="Input department" />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Product Family</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.productFamily} onChange={(event) => update("productFamily", event.target.value)} placeholder="Input product family" />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Item UOM</FieldLabel>
                          <AppSelect
                            value={values.itemUom || "none"}
                            onValueChange={(value) => update("itemUom", value === "none" ? "" : value)}
                            options={ITEM_UOM_OPTIONS}
                            triggerClassName={STYLE_DIALOG_INPUT_CLASS}
                          />
                        </div>
                        <div className={STYLE_DIALOG_FIELD_CLASS}>
                          <FieldLabel>Image ID</FieldLabel>
                          <Input className={STYLE_DIALOG_INPUT_CLASS} value={values.imageId} onChange={(event) => update("imageId", event.target.value)} placeholder="Optional file ID" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      id="production-smv"
                      ref={setSectionRef("production-smv")}
                      className="scroll-mt-32 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80 lg:scroll-mt-3"
                    >
                      <CardHeader className="px-4 pb-2 pt-3">
                        <CardTitle className="text-sm">Production / SMV</CardTitle>
                      </CardHeader>
                      <CardContent className="grid min-w-0 gap-4 px-3 pb-3 sm:px-4 md:grid-cols-2 xl:grid-cols-3">
                        {([
                          ["cmSewing", "CM Sewing"],
                          ["smvSewing", "SMV Sewing"],
                          ["smvSewingSideSeam", "SMV Sewing Side Seam"],
                          ["smvCutting", "SMV Cutting"],
                          ["smvCuttingSideSeam", "SMV Cutting Side Seam"],
                          ["smvFinishing", "SMV Finishing"],
                        ] as Array<[keyof StyleFormValues, string]>).map(([field, label]) => (
                          <div key={field} className={STYLE_DIALOG_FIELD_CLASS}>
                            <FieldLabel>{label}</FieldLabel>
                            <Input
                              className={STYLE_DIALOG_INPUT_CLASS}
                              value={String(values[field])}
                              onChange={(event) => update(field, event.target.value as never)}
                              inputMode="decimal"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <ChildMappingCard
                      sectionId="colors"
                      sectionRef={setSectionRef("colors")}
                      title="Color mappings"
                      addLabel="Add color"
                      placeholder="Search color"
                      values={values.colors}
                      loadItems={loadColorOptions}
                      onChange={(nextValues) => update("colors", nextValues)}
                    />
                    {/* <ChildMappingCard
                      sectionId="sizes"
                      sectionRef={setSectionRef("sizes")}
                      title="Size mappings"
                      addLabel="Add size"
                      placeholder="Search size"
                      values={values.sizes}
                      loadItems={loadSizeOptions}
                      onChange={(nextValues) => update("sizes", nextValues)}
                    /> */}
                    {/* <ChildMappingCard
                      sectionId="embellishments"
                      sectionRef={setSectionRef("embellishments")}
                      title="Embellishment mappings"
                      addLabel="Add embellishment"
                      placeholder="Search embellishment"
                      values={values.embellishments}
                      loadItems={loadEmbellishmentOptions}
                      onChange={(nextValues) => update("embellishments", nextValues)}
                    /> */}

                    <Card
                      id="remarks-status"
                      ref={setSectionRef("remarks-status")}
                      className="scroll-mt-32 overflow-hidden rounded-lg border-slate-200/70 bg-white/75 shadow-none dark:border-white/10 dark:bg-[#17131d]/80 lg:scroll-mt-3"
                    >
                      <CardHeader className="px-4 pb-2 pt-3">
                        <CardTitle className="text-sm">Remarks / Status</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 px-3 pb-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <div className="space-y-2">
                          <FieldLabel>Remarks</FieldLabel>
                          <Textarea className="rounded-md text-sm" value={values.remarks} onChange={(event) => update("remarks", event.target.value)} rows={4} placeholder="Optional remarks" />
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">Active</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active styles can be selected in merchandising flows.</p>
                            </div>
                            <Switch checked={values.isActive} onCheckedChange={(checked) => update("isActive", checked)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="border-t border-slate-200/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-[#0a0d19]/95 sm:px-4">
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-10 w-full rounded-xl sm:min-h-0 sm:w-auto sm:rounded-md">
                Cancel
              </Button>
              <Button type="button" disabled={loading || submitting} onClick={onSubmit} className="min-h-10 w-full rounded-xl sm:min-h-0 sm:w-auto sm:rounded-md">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save Style" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StyleTable({
  title,
  description,
  styles,
  meta,
  loading,
  error,
  deleted = false,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onRefresh,
}: {
  title: string
  description: string
  styles: StyleRecord[]
  meta: PaginationMeta | null
  loading: boolean
  error: string
  deleted?: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: (style: StyleRecord) => void
  onDelete: (style: StyleRecord) => void
  onRestore: (style: StyleRecord) => void
  onPermanentDelete: (style: StyleRecord) => void
  onRefresh: () => void
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {meta?.total ?? styles.length} {deleted ? "deleted" : "active"}
            </Badge>
            <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={onRefresh}>
              <RefreshCcw className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <EmptyState title={`Unable to load ${deleted ? "deleted " : ""}styles`} description={error} />
          </div>
        ) : styles.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={deleted ? "No deleted styles found" : "No styles found"}
              description={deleted ? "Soft deleted styles will appear here." : "Create a style to start building style mappings."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Mappings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{deleted ? "Deleted" : "Updated"}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {styles.map((style) => (
                  <TableRow key={style.id}>
                    <TableCell>
                      <div className="font-medium text-slate-950 dark:text-white">{style.styleNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{style.styleName || style.productType || "-"}</div>
                    </TableCell>
                    <TableCell>{getBuyerLabel(style.buyer)}</TableCell>
                    <TableCell>{getCurrencyLabel(style.currency)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="rounded-full">Colors {style.styleToColorMaps?.length ?? 0}</Badge>
                        <Badge variant="outline" className="rounded-full">Sizes {style.styleToSizeMaps?.length ?? 0}</Badge>
                        <Badge variant="outline" className="rounded-full">Emb {style.styleToEmbellishmentMaps?.length ?? 0}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-full", style.isActive === false ? "bg-slate-500" : "bg-emerald-600")}>
                        {style.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{formatDateTime(deleted ? style.deleted_at : style.updated_at || style.created_at)}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {formatUser(deleted ? style.deleted_by_user : style.updated_by_user || style.created_by_user)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {deleted ? (
                          <>
                            {canUpdate ? (
                              <Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={() => onRestore(style)}>
                                <RotateCcw className="size-4" />
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button type="button" variant="ghost" size="icon" className="rounded-xl text-red-500 hover:text-red-600" onClick={() => onPermanentDelete(style)}>
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {canUpdate ? (
                              <Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={() => onEdit(style)}>
                                <Edit3 className="size-4" />
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button type="button" variant="ghost" size="icon" className="rounded-xl text-red-500 hover:text-red-600" onClick={() => onDelete(style)}>
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StyleWorkspace() {
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [accessRules, setAccessRules] = useState<StyleAccessRules | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [filters, setFilters] = useState<StyleFilterValues>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<StyleFilterValues>(DEFAULT_FILTERS)
  const [selectedFilterBuyer, setSelectedFilterBuyer] = useState<SelectOption | null>(null)
  const [selectedFilterCurrency, setSelectedFilterCurrency] = useState<SelectOption | null>(null)
  const [filterBuyerOpen, setFilterBuyerOpen] = useState(false)
  const [filterCurrencyOpen, setFilterCurrencyOpen] = useState(false)
  const [styles, setStyles] = useState<StyleRecord[]>([])
  const [deletedStyles, setDeletedStyles] = useState<StyleRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<StyleEditorMode>("create")
  const [editingStyleId, setEditingStyleId] = useState("")
  const [formValues, setFormValues] = useState<StyleFormValues>(DEFAULT_FORM_VALUES)
  const [formErrors, setFormErrors] = useState<StyleFormError[]>([])
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedBuyer, setSelectedBuyer] = useState<SelectOption | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<SelectOption | null>(null)
  const [pendingStyle, setPendingStyle] = useState<StyleRecord | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionWorking, setActionWorking] = useState(false)

  const handleAuthFailure = useCallback(
    (message: string) => {
      if (!normalizeAuthFailure(message)) {
        return false
      }

      toast.error(message)
      router.replace("/login")
      return true
    },
    [router],
  )

  const getToken = useCallback(() => {
    if (typeof window === "undefined") {
      return ""
    }

    return window.localStorage.getItem("access_token") ?? ""
  }, [])

  const loadBuyerOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = getToken()
      const response = await fetchBuyers({
        apiUrl,
        accessToken: token,
        page,
        limit,
        organizationId: selectedOrganizationId || undefined,
        filters: {
          name: query,
          displayName: "",
          contact: "",
          email: "",
          countryId: "",
          address: "",
          isActive: "",
          remarks: "",
        },
      })

      return { items: response.items.map(mapBuyerOption), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, getToken, selectedOrganizationId],
  )

  const loadCurrencyOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = getToken()
      const response = await fetchCurrencies({
        apiUrl,
        accessToken: token,
        page,
        limit,
        organizationId: selectedOrganizationId || undefined,
        filters: { currencyName: query, currencyCode: "", symbol: "" },
      })

      return { items: response.items.map(mapCurrencyOption), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, getToken, selectedOrganizationId],
  )

  const loadColorOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = getToken()
      const response = await fetchColors({
        apiUrl,
        accessToken: token,
        page,
        limit,
        organizationId: selectedOrganizationId || undefined,
        filters: { colorName: query, colorDisplayName: "", colorDescription: "" },
      })

      return { items: response.items.map(mapColorOption), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, getToken, selectedOrganizationId],
  )

  const loadSizeOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = getToken()
      const response = await fetchSizes({
        apiUrl,
        accessToken: token,
        page,
        limit,
        organizationId: selectedOrganizationId || undefined,
        filters: { sizeName: query },
      })

      return { items: response.items.map(mapSizeOption), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, getToken, selectedOrganizationId],
  )

  const loadEmbellishmentOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams) => {
      const token = getToken()
      const response = await fetchEmbellishments({
        apiUrl,
        accessToken: token,
        page,
        limit,
        organizationId: selectedOrganizationId || undefined,
        filters: { name: query, remarks: "" },
      })

      return { items: response.items.map(mapEmbellishmentOption), hasNextPage: response.meta.hasNextPage }
    },
    [apiUrl, getToken, selectedOrganizationId],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? String(event.detail?.organizationId ?? "") : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId)
      setRefreshVersion((version) => version + 1)
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)

    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
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
        const token = getToken()
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
          menuName: STYLE_MENU_NAME,
        })

        if (active) {
          setAccessRules({
            canView: permission.canView,
            canCreate: permission.canCreate,
            canUpdate: permission.canUpdate,
            canDelete: permission.canDelete,
          })
        }
      } catch (caughtError) {
        if (!active) return
        const message = getErrorMessage(caughtError)
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
  }, [apiUrl, getToken, handleAuthFailure, refreshVersion, selectedOrganizationId])

  const loadActiveStyles = useCallback(async () => {
    if (!accessRules?.canView) return

    setLoading(true)
    setError("")

    try {
      const token = getToken()
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const response = await fetchStyles({
        apiUrl,
        accessToken: token,
        page: 1,
        limit: PAGE_SIZE,
        filters: appliedFilters,
        organizationId: selectedOrganizationId || undefined,
      })

      setStyles(response.items)
      setMeta(response.meta)
    } catch (caughtError) {
      const message = getErrorMessage(caughtError)
      if (handleAuthFailure(message)) return
      setError(message)
      setStyles([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [accessRules?.canView, apiUrl, appliedFilters, getToken, handleAuthFailure, selectedOrganizationId])

  const loadDeletedStyles = useCallback(async () => {
    if (!accessRules?.canView) return

    setLoadingDeleted(true)
    setDeletedError("")

    try {
      const token = getToken()
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const response = await fetchStyles({
        apiUrl,
        accessToken: token,
        page: 1,
        limit: PAGE_SIZE,
        filters: appliedFilters,
        deletedOnly: true,
        organizationId: selectedOrganizationId || undefined,
      })

      setDeletedStyles(response.items)
      setDeletedMeta(response.meta)
    } catch (caughtError) {
      const message = getErrorMessage(caughtError)
      if (handleAuthFailure(message)) return
      setDeletedError(message)
      setDeletedStyles([])
      setDeletedMeta(null)
    } finally {
      setLoadingDeleted(false)
    }
  }, [accessRules?.canView, apiUrl, appliedFilters, getToken, handleAuthFailure, selectedOrganizationId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadActiveStyles()
      void loadDeletedStyles()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadActiveStyles, loadDeletedStyles, refreshVersion])

  const activeTotal = meta?.total ?? styles.length
  const deletedTotal = deletedMeta?.total ?? deletedStyles.length
  const selectedStatus = filters.isActive || "all"
  const selectedBuyerValue = selectedBuyer ?? (formValues.buyerId ? toOption("Selected buyer", formValues.buyerId) : null)
  const selectedCurrencyValue = selectedCurrency ?? (formValues.currencyId ? toOption("Selected currency", formValues.currencyId) : null)

  function openCreateDialog() {
    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to create styles.")
      return
    }

    setEditorMode("create")
    setEditingStyleId("")
    setFormValues(DEFAULT_FORM_VALUES)
    setSelectedBuyer(null)
    setSelectedCurrency(null)
    setFormErrors([])
    setDialogOpen(true)
  }

  async function openEditDialog(style: StyleRecord) {
    if (!accessRules?.canUpdate) {
      toast.error("You do not have permission to update styles.")
      return
    }

    setEditorMode("edit")
    setEditingStyleId(style.id)
    setFormErrors([])
    setDialogOpen(true)
    setLoadingEditor(true)

    try {
      const token = getToken()
      const fullStyle = await fetchStyle({
        apiUrl,
        accessToken: token,
        id: style.id,
        organizationId: selectedOrganizationId || undefined,
      })
      setFormValues(styleToFormValues(fullStyle))
      setSelectedBuyer(fullStyle.buyer ? toOption(getBuyerLabel(fullStyle.buyer), fullStyle.buyerId) : null)
      setSelectedCurrency(fullStyle.currency ? toOption(getCurrencyLabel(fullStyle.currency), String(fullStyle.currencyId)) : null)
    } catch (caughtError) {
      const message = getErrorMessage(caughtError)
      if (handleAuthFailure(message)) return
      toast.error(message)
      setDialogOpen(false)
    } finally {
      setLoadingEditor(false)
    }
  }

  async function submitStyle() {
    const validationErrors = validateForm(formValues)
    setFormErrors(validationErrors)

    if (validationErrors.length > 0) {
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

    setSubmitting(true)

    try {
      const token = getToken()
      if (editorMode === "create") {
        await createStyle({
          apiUrl,
          accessToken: token,
          payload: formValues,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Style saved successfully.")
      } else {
        await updateStyle({
          apiUrl,
          accessToken: token,
          id: editingStyleId,
          payload: formValues,
          organizationId: selectedOrganizationId || undefined,
        })
        toast.success("Style updated successfully.")
      }

      setDialogOpen(false)
      setRefreshVersion((version) => version + 1)
    } catch (caughtError) {
      const message = getErrorMessage(caughtError)
      if (handleAuthFailure(message)) return
      setFormErrors([{ message, section: "basic-info" }])
    } finally {
      setSubmitting(false)
    }
  }

  async function runPendingAction() {
    if (!pendingStyle || !pendingAction) return

    setActionWorking(true)

    try {
      const token = getToken()
      if (pendingAction === "soft-delete") {
        await softDeleteStyle({ apiUrl, accessToken: token, id: pendingStyle.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Style deleted successfully.")
      } else if (pendingAction === "restore") {
        await restoreStyle({ apiUrl, accessToken: token, id: pendingStyle.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Style restored successfully.")
      } else {
        await permanentlyDeleteStyle({ apiUrl, accessToken: token, id: pendingStyle.id, organizationId: selectedOrganizationId || undefined })
        toast.success("Style permanently deleted.")
      }

      setPendingStyle(null)
      setPendingAction(null)
      setRefreshVersion((version) => version + 1)
    } catch (caughtError) {
      const message = getErrorMessage(caughtError)
      if (handleAuthFailure(message)) return
      toast.error(message)
    } finally {
      setActionWorking(false)
    }
  }

  function applyFilters() {
    setAppliedFilters(filters)
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    setSelectedFilterBuyer(null)
    setSelectedFilterCurrency(null)
  }

  const pendingActionLabel = useMemo(() => {
    if (pendingAction === "restore") return "Restore style"
    if (pendingAction === "permanent") return "Delete permanently"
    return "Delete style"
  }, [pendingAction])

  if (loadingAccessRules) {
    return <PageSkeleton />
  }

  if (!accessRules?.canView) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          title="Style access is not available"
          description={accessError || "You do not have permission to view Style Setup. Please contact your administrator."}
        />
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-4 sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Merchandising Master</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Style Setup</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Maintain style master records with buyer, currency, color, size, and embellishment mappings.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full">{activeTotal} active</Badge>
                    <Badge variant="outline" className="rounded-full">{deletedTotal} deleted</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setRefreshVersion((version) => version + 1)}>
                    <RefreshCcw className="size-4" />
                    Refresh
                  </Button>
                  {accessRules.canCreate ? (
                    <Button type="button" className="rounded-xl" onClick={openCreateDialog}>
                      <Plus className="size-4" />
                      Create style
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
              <CardTitle className="text-base">Filters</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">Search styles by style no, style name, product type, buyer, currency, or status.</p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                <div className="space-y-1">
                  <FieldLabel>Style No</FieldLabel>
                  <Input value={filters.styleNo} onChange={(event) => setFilters((current) => ({ ...current, styleNo: event.target.value }))} placeholder="Input style no" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Style Name</FieldLabel>
                  <Input value={filters.styleName} onChange={(event) => setFilters((current) => ({ ...current, styleName: event.target.value }))} placeholder="Input style name" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Product Type</FieldLabel>
                  <Input value={filters.productType} onChange={(event) => setFilters((current) => ({ ...current, productType: event.target.value }))} placeholder="Input product type" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Buyer</FieldLabel>
                  <AppCombobox
                    open={filterBuyerOpen}
                    onOpenChange={setFilterBuyerOpen}
                    value={selectedFilterBuyer}
                    onValueChange={(option) => {
                      setSelectedFilterBuyer(option)
                      setFilters((current) => ({ ...current, buyerId: option?.value ?? "" }))
                      setFilterBuyerOpen(false)
                    }}
                    loadItems={loadBuyerOptions}
                    initialLimit={10}
                    searchLimit={10}
                    placeholder="All buyers"
                    showClear={Boolean(filters.buyerId)}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Currency</FieldLabel>
                  <AppCombobox
                    open={filterCurrencyOpen}
                    onOpenChange={setFilterCurrencyOpen}
                    value={selectedFilterCurrency}
                    onValueChange={(option) => {
                      setSelectedFilterCurrency(option)
                      setFilters((current) => ({ ...current, currencyId: option?.value ?? "" }))
                      setFilterCurrencyOpen(false)
                    }}
                    loadItems={loadCurrencyOptions}
                    initialLimit={10}
                    searchLimit={10}
                    placeholder="All currencies"
                    showClear={Boolean(filters.currencyId)}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Status</FieldLabel>
                  <AppSelect
                    value={selectedStatus}
                    onValueChange={(value) => setFilters((current) => ({ ...current, isActive: value === "all" ? "" : value }))}
                    options={STATUS_OPTIONS}
                    triggerClassName="h-9 rounded-xl text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
                  <Button type="button" className="rounded-xl" onClick={applyFilters}>
                    <Search className="size-4" />
                    Search
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <StyleTable
            title="Styles"
            description="Active style master records."
            styles={styles}
            meta={meta}
            loading={loading}
            error={error}
            canUpdate={accessRules.canUpdate}
            canDelete={accessRules.canDelete}
            onEdit={openEditDialog}
            onDelete={(style) => {
              setPendingStyle(style)
              setPendingAction("soft-delete")
            }}
            onRestore={() => undefined}
            onPermanentDelete={() => undefined}
            onRefresh={() => setRefreshVersion((version) => version + 1)}
          />

          <StyleTable
            title="Deleted styles"
            description="Restore soft deleted styles or remove them permanently."
            styles={deletedStyles}
            meta={deletedMeta}
            loading={loadingDeleted}
            error={deletedError}
            deleted
            canUpdate={accessRules.canUpdate}
            canDelete={accessRules.canDelete}
            onEdit={openEditDialog}
            onDelete={() => undefined}
            onRestore={(style) => {
              setPendingStyle(style)
              setPendingAction("restore")
            }}
            onPermanentDelete={(style) => {
              setPendingStyle(style)
              setPendingAction("permanent")
            }}
            onRefresh={() => setRefreshVersion((version) => version + 1)}
          />
        </div>
      </ScrollArea>

      <StyleEntryDialog
        open={dialogOpen}
        mode={editorMode}
        loading={loadingEditor}
        submitting={submitting}
        values={formValues}
        errors={formErrors}
        selectedBuyer={selectedBuyerValue}
        selectedCurrency={selectedCurrencyValue}
        loadBuyerOptions={loadBuyerOptions}
        loadCurrencyOptions={loadCurrencyOptions}
        loadColorOptions={loadColorOptions}
        loadSizeOptions={loadSizeOptions}
        loadEmbellishmentOptions={loadEmbellishmentOptions}
        onBuyerOptionChange={setSelectedBuyer}
        onCurrencyOptionChange={setSelectedCurrency}
        onValuesChange={(nextValues) => {
          setFormValues(nextValues)
          if (nextValues.buyerId !== formValues.buyerId && !nextValues.buyerId) setSelectedBuyer(null)
          if (nextValues.currencyId !== formValues.currencyId && !nextValues.currencyId) setSelectedCurrency(null)
        }}
        onOpenChange={setDialogOpen}
        onSubmit={submitStyle}
      />

      <AlertDialog open={Boolean(pendingStyle && pendingAction)} onOpenChange={(open) => {
        if (!open && !actionWorking) {
          setPendingStyle(null)
          setPendingAction(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingActionLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "permanent"
                ? "This will permanently delete the style and cannot be undone."
                : pendingAction === "restore"
                  ? "This will restore the selected style to the active list."
                  : "This will move the style to the deleted list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => {
              event.preventDefault()
              void runPendingAction()
            }} disabled={actionWorking}>
              {actionWorking ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {pendingActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
