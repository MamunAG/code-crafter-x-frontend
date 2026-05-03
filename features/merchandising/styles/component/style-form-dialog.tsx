"use client"

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Info,
  Loader2,
  MessageSquare,
  Palette,
  Plus,
  Ruler,
  Settings,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxOption } from "@/components/app-combobox"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type {
  StyleChildOptionValue,
  StyleDialogSectionId,
  StyleFormError,
  StyleFormValues,
} from "../style.types"

type SelectOption = AppComboboxOption

type StyleFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  values: StyleFormValues
  errors: StyleFormError[]
  selectedBuyer: SelectOption | null
  selectedCurrency: SelectOption | null
  imagePreviewUrl: string
  imageUploading: boolean
  loadBuyerOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadCurrencyOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadColorOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadSizeOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  loadEmbellishmentOptions: (params: AppComboboxLoadParams) => Promise<{ items: SelectOption[]; hasNextPage: boolean }>
  onBuyerOptionChange: (option: SelectOption | null) => void
  onCurrencyOptionChange: (option: SelectOption | null) => void
  onImageUpload: (file: File | null | undefined) => void
  onValuesChange: (values: StyleFormValues) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

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
        <div className="space-y-2 md:hidden">
          {values.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              No rows added yet.
            </div>
          ) : (
            values.map((item, index) => (
              <div
                key={item.id}
                className="space-y-2 rounded-md border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-950/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary" className="rounded-md">
                    #{index + 1}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-emerald-600/15 px-2 py-0 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-600/15 dark:text-emerald-300">
                      Active
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-md text-red-500 hover:text-red-600"
                      onClick={() => removeRow(item.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
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
                  inputClassName="w-full min-w-0"
                  contentClassName="rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-slate-100/70 px-2 py-1.5 dark:bg-white/[0.04]">
                    <p className="text-slate-500 dark:text-slate-400">Code</p>
                    <p className="mt-0.5 font-medium">{item.value ? `#${item.value}` : "-"}</p>
                  </div>
                  <div className="rounded-md bg-slate-100/70 px-2 py-1.5 dark:bg-white/[0.04]">
                    <p className="text-slate-500 dark:text-slate-400">Display Name</p>
                    <p className="mt-0.5 truncate font-medium">{item.label || "-"}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-md border border-slate-200/70 dark:border-white/10 md:block">
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

export function StyleFormDialog({
  open,
  mode,
  loading,
  submitting,
  values,
  errors,
  selectedBuyer,
  selectedCurrency,
  imagePreviewUrl,
  imageUploading,
  loadBuyerOptions,
  loadCurrencyOptions,
  loadColorOptions,
  loadSizeOptions,
  loadEmbellishmentOptions,
  onBuyerOptionChange,
  onCurrencyOptionChange,
  onImageUpload,
  onValuesChange,
  onOpenChange,
  onSubmit,
}: StyleFormDialogProps) {
  const [buyerOpen, setBuyerOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<StyleDialogSectionId>("basic-info")
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
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
                      </CardContent>
                      <CardContent className="border-t border-slate-200/70 px-3 py-4 sm:px-4 dark:border-white/10">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                          <div className="space-y-3">
                            <div className={STYLE_DIALOG_FIELD_CLASS}>
                              <FieldLabel>Image ID</FieldLabel>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  className={STYLE_DIALOG_INPUT_CLASS}
                                  value={values.imageId}
                                  onChange={(event) => update("imageId", event.target.value)}
                                  placeholder="Uploaded file ID"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-xl sm:w-auto"
                                  onClick={() => imageInputRef.current?.click()}
                                  disabled={imageUploading || loading || submitting}
                                >
                                  {imageUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                                  Upload image
                                </Button>
                              </div>
                              <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  void onImageUpload(event.currentTarget.files?.[0])
                                  event.currentTarget.value = ""
                                }}
                              />
                            </div>
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                              <p className="font-medium text-slate-800 dark:text-slate-100">Image guidance</p>
                              <p className="mt-1 leading-6">
                                Uploading an image stores the backend file id here automatically. Save the style to attach it to the record.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                Uploaded preview
                              </p>
                              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                                File ID {values.imageId || "-"}
                              </Badge>
                            </div>

                            {imagePreviewUrl ? (
                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
                                <div className="flex items-center justify-center bg-slate-50 px-4 py-4 dark:bg-white/[0.03]">
                                  <img
                                    src={imagePreviewUrl}
                                    alt="Uploaded style preview"
                                    className="max-h-64 w-full rounded-xl object-contain"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                                No image uploaded yet. Use the button to add a preview.
                              </div>
                            )}
                          </div>
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
                    <ChildMappingCard
                      sectionId="sizes"
                      sectionRef={setSectionRef("sizes")}
                      title="Size mappings"
                      addLabel="Add size"
                      placeholder="Search size"
                      values={values.sizes}
                      loadItems={loadSizeOptions}
                      onChange={(nextValues) => update("sizes", nextValues)}
                    />
                    <ChildMappingCard
                      sectionId="embellishments"
                      sectionRef={setSectionRef("embellishments")}
                      title="Embellishment mappings"
                      addLabel="Add embellishment"
                      placeholder="Search embellishment"
                      values={values.embellishments}
                      loadItems={loadEmbellishmentOptions}
                      onChange={(nextValues) => update("embellishments", nextValues)}
                    />

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
              {/* <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-10 w-full rounded-xl sm:min-h-0 sm:w-auto sm:rounded-md">
                Cancel
              </Button> */}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {/* <Button type="button" disabled={loading || submitting} onClick={onSubmit} className="min-h-10 w-full rounded-xl sm:min-h-0 sm:w-auto sm:rounded-md"> */}
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
