"use client"

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import {
  Download,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import AppAddNewButton from "@/components/app-add-new-button"
import { AppDataFilterForm } from "@/components/app-data-filter-form"
import { AppDataSection } from "@/components/app-data-section"
import AppRefreshButton from "@/components/app-refresh-button"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
} from "@/lib/organization-selection"

import {
  deleteMasterData,
  downloadTemplate,
  getMasterData,
  listMasterData,
  restoreMasterData,
  saveMasterData,
  uploadTemplate,
} from "./master-data.service"
import type {
  HolidayRow,
  MasterDataConfig,
  MasterDataField,
  MasterDataFormValues,
  MasterDataRecord,
  PaginationMeta,
} from "./master-data.types"

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
const ALL_STATUS_VALUE = "__all_statuses__"

function defaultValues(config: MasterDataConfig): MasterDataFormValues {
  return {
    code: "",
    name: "",
    nameBn: "",
    isActive: true,
    settings: Object.fromEntries(
      config.fields.map((field) => [
        field.key,
        field.defaultValue ?? (field.kind === "boolean" ? false : ""),
      ])
    ),
  }
}

function token() {
  const value = window.localStorage.getItem("access_token")
  if (!value) throw new Error("Your session expired. Please sign in again.")
  return value
}

function isAuthError(message: string) {
  return (
    message.toLowerCase().includes("session expired") ||
    message.toLowerCase().includes("unauthorized")
  )
}

function SettingsField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: MasterDataField
  value: unknown
  disabled: boolean
  onChange: (value: unknown) => void
}) {
  if (field.kind === "boolean")
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50/70 p-4 dark:bg-white/[0.03]">
        <div>
          <p className="text-sm font-medium">{field.label}</p>
          {field.description ? (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    )

  if (field.kind === "weekday-multi") {
    const selected = Array.isArray(value) ? value.map(Number) : []
    return (
      <div className="space-y-2 sm:col-span-2">
        <label className="text-sm font-medium">{field.label}</label>
        <div className="grid gap-2 sm:grid-cols-4">
          {WEEKDAYS.map((day, index) => (
            <label
              key={day}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <input
                type="checkbox"
                checked={selected.includes(index)}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, index].sort()
                      : selected.filter((item) => item !== index)
                  )
                }
              />
              {day}
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (field.kind === "holidays") {
    const holidays = (Array.isArray(value) ? value : []) as HolidayRow[]
    const update = (index: number, key: keyof HolidayRow, next: string) =>
      onChange(
        holidays.map((holiday, row) =>
          row === index ? { ...holiday, [key]: next } : holiday
        )
      )
    return (
      <div className="space-y-3 sm:col-span-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{field.label}</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange([...holidays, { date: "", name: "", nameBn: "" }])
            }
          >
            <Plus />
            Add holiday
          </Button>
        </div>
        {holidays.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No holiday dates added.
          </p>
        ) : (
          holidays.map((holiday, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[150px_1fr_1fr_auto]"
            >
              <Input
                type="date"
                value={holiday.date}
                disabled={disabled}
                onChange={(event) => update(index, "date", event.target.value)}
              />
              <Input
                placeholder="Holiday name"
                value={holiday.name}
                disabled={disabled}
                onChange={(event) => update(index, "name", event.target.value)}
              />
              <Input
                placeholder="Bangla name"
                value={holiday.nameBn ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  update(index, "nameBn", event.target.value)
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() =>
                  onChange(holidays.filter((_, row) => row !== index))
                }
              >
                <X />
              </Button>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{field.label}</label>
      {field.kind === "select" ? (
        <select
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={field.kind === "number" ? "number" : "text"}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          value={value === undefined || value === null ? "" : String(value)}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              field.kind === "number"
                ? event.target.value === ""
                  ? ""
                  : Number(event.target.value)
                : event.target.value
            )
          }
        />
      )}
    </div>
  )
}

function FormDialog({
  config,
  open,
  mode,
  initial: draft,
  loading,
  submitting,
  error,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: {
  config: MasterDataConfig
  open: boolean
  mode: "create" | "edit"
  initial: MasterDataFormValues
  loading: boolean
  submitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onValuesChange: (values: MasterDataFormValues) => void
  onSubmit: (values: MasterDataFormValues) => void
}) {
  const setDraft = (
    update: (current: MasterDataFormValues) => MasterDataFormValues
  ) => onValuesChange(update(draft))
  const disabled = loading || submitting
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-4xl">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(draft)
          }}
        >
          <div className="border-b border-slate-200/70 px-6 pt-6 pb-4 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>
                {mode === "create"
                  ? `Create ${config.singular}`
                  : `Edit ${config.singular}`}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? `Add a ${config.singular} master record.`
                  : `Update the selected ${config.singular} master record.`}
              </DialogDescription>
            </DialogHeader>
            {!loading && error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </p>
            ) : null}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={draft.code}
                  disabled={disabled || mode === "edit"}
                  placeholder="Unique code"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">English name *</label>
                <Input
                  value={draft.name}
                  disabled={disabled}
                  placeholder={`Enter ${config.singular} name`}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Bangla name</label>
                <Input
                  value={draft.nameBn}
                  disabled={disabled}
                  placeholder="Optional Bangla name"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      nameBn: event.target.value,
                    }))
                  }
                />
              </div>
              {config.fields.map((field) => (
                <SettingsField
                  key={field.key}
                  field={field}
                  value={draft.settings[field.key]}
                  disabled={disabled}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      settings: { ...current.settings, [field.key]: value },
                    }))
                  }
                />
              ))}
              <div className="flex items-center justify-between rounded-xl border bg-slate-50/70 p-4 sm:col-span-2 dark:bg-white/[0.03]">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Active records can be selected in HR and payroll
                    transactions.
                  </p>
                </div>
                <Switch
                  checked={draft.isActive}
                  disabled={disabled}
                  onCheckedChange={(isActive) =>
                    setDraft((current) => ({ ...current, isActive }))
                  }
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={disabled || !draft.code.trim() || !draft.name.trim()}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {mode === "create" ? `Save ${config.singular}` : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RecordsCard({
  config,
  title,
  records,
  meta,
  loading,
  deleted,
  page,
  filters,
  headerActions,
  onPage,
  onEdit,
  onDelete,
  onRestore,
  onPermanent,
}: {
  config: MasterDataConfig
  title: string
  records: MasterDataRecord[]
  meta: PaginationMeta | null
  loading: boolean
  deleted?: boolean
  page: number
  filters?: ReactNode
  headerActions?: ReactNode
  onPage: (page: number) => void
  onEdit: (id: string) => void
  onDelete: (record: MasterDataRecord) => void
  onRestore: (record: MasterDataRecord) => void
  onPermanent: (record: MasterDataRecord) => void
}) {
  const pageSummary = meta?.total
    ? `Showing ${(meta.page - 1) * meta.limit + 1}-${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`
    : `No ${deleted ? "deleted " : ""}${config.singular} records found`
  const columns = useMemo<ColumnDef<MasterDataRecord>[]>(
    () => [
      {
        id: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-slate-950 dark:text-slate-50">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "nameBn",
        header: "Bangla name",
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-300">
            {row.original.nameBn || "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className="rounded-full px-3 py-1"
            variant={
              deleted
                ? "destructive"
                : row.original.isActive
                  ? "secondary"
                  : "outline"
            }
          >
            {deleted
              ? "Deleted"
              : row.original.isActive
                ? "Active"
                : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {deleted ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  title="Restore"
                  onClick={() => onRestore(row.original)}
                >
                  <RotateCcw />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  title="Delete permanently"
                  onClick={() => onPermanent(row.original)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  title="Edit"
                  onClick={() => onEdit(row.original.id)}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  title="Delete"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [deleted, onDelete, onEdit, onPermanent, onRestore]
  )

  return (
    <AppDataSection
      title={title}
      description={pageSummary}
      data={records}
      columns={columns}
      loading={loading}
      filters={filters}
      headerActions={headerActions}
      headerBadges={
        <>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
          </Badge>
          {deleted ? (
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              {meta?.total ?? records.length} deleted
            </Badge>
          ) : null}
        </>
      }
      pageSummary={pageSummary}
      page={page}
      totalPages={meta?.totalPages ?? 1}
      onPageChange={onPage}
      getRowId={(record) => record.id}
      leadingColumnIds={["code"]}
      emptyState={
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No records found.
        </p>
      }
      renderMobileItem={(record) => (
        <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                {record.name}
              </p>
              <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                {record.code}
              </p>
            </div>
            <div className="flex gap-1">
              {deleted ? (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    title="Restore"
                    onClick={() => onRestore(record)}
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    title="Delete permanently"
                    onClick={() => onPermanent(record)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    title="Edit"
                    onClick={() => onEdit(record.id)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    title="Delete"
                    onClick={() => onDelete(record)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              className="rounded-full px-3 py-1"
              variant={
                deleted
                  ? "destructive"
                  : record.isActive
                    ? "secondary"
                    : "outline"
              }
            >
              {deleted ? "Deleted" : record.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {record.nameBn ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {record.nameBn}
            </p>
          ) : null}
        </article>
      )}
    />
  )
}

export function MasterDataWorkspace({
  apiUrl,
  config,
}: {
  apiUrl: string
  config: MasterDataConfig
}) {
  const router = useRouter()
  const uploadRef = useRef<HTMLInputElement>(null)
  const [organizationId, setOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId()
  )
  const [records, setRecords] = useState<MasterDataRecord[]>([])
  const [deleted, setDeleted] = useState<MasterDataRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [deletedPage, setDeletedPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [deletedSearch, setDeletedSearch] = useState("")
  const [deletedStatus, setDeletedStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
  const [editorValues, setEditorValues] = useState(() => defaultValues(config))
  const [editingId, setEditingId] = useState<string | undefined>()
  const [editorLoading, setEditorLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [confirm, setConfirm] = useState<{
    record: MasterDataRecord
    action: "delete" | "restore" | "permanent"
  } | null>(null)
  const [working, setWorking] = useState(false)
  const [recentlyDeleted, setRecentlyDeleted] =
    useState<MasterDataRecord | null>(null)

  const authFailure = useCallback(
    (message: string) => {
      if (!isAuthError(message)) return false
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("auth_user")
      router.replace("/sign-in")
      return true
    },
    [router]
  )
  useEffect(() => {
    const handler = (event: Event) =>
      setOrganizationId(
        event instanceof CustomEvent
          ? event.detail?.organizationId || ""
          : readSelectedOrganizationId()
      )
    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handler)
    return () =>
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handler)
  }, [])

  const load = useCallback(async () => {
    if (!organizationId) {
      setRecords([])
      setDeleted([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const accessToken = token()
      const [activeResult, deletedResult] = await Promise.all([
        listMasterData({
          apiUrl,
          token: accessToken,
          organizationId,
          config,
          page,
          limit: 10,
          search,
          isActive: status,
        }),
        listMasterData({
          apiUrl,
          token: accessToken,
          organizationId,
          config,
          page: deletedPage,
          limit: 5,
          search: deletedSearch,
          isActive: deletedStatus,
          deletedOnly: true,
        }),
      ])
      setRecords(activeResult.items)
      setMeta(activeResult.meta)
      setDeleted(deletedResult.items)
      setDeletedMeta(deletedResult.meta)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to load ${config.singular} records.`
      if (!authFailure(message)) toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [
    apiUrl,
    authFailure,
    config,
    deletedPage,
    deletedSearch,
    deletedStatus,
    organizationId,
    page,
    search,
    status,
  ])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load, refresh])

  const openEdit = async (id: string) => {
    setEditorMode("edit")
    setEditingId(id)
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError("")
    try {
      const record = await getMasterData(
        apiUrl,
        token(),
        organizationId,
        config,
        id
      )
      setEditorValues({
        code: record.code,
        name: record.name,
        nameBn: record.nameBn ?? "",
        settings: record.settings ?? {},
        isActive: record.isActive,
        rowVersion: record.rowVersion,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load the record."
      setEditorError(message)
      authFailure(message)
    } finally {
      setEditorLoading(false)
    }
  }
  const submit = async (values: MasterDataFormValues) => {
    setSubmitting(true)
    setEditorError("")
    try {
      await saveMasterData(
        apiUrl,
        token(),
        organizationId,
        config,
        values,
        editingId
      )
      toast.success(
        `${config.title.replace(" Setup", "")} ${editingId ? "updated" : "created"} successfully.`
      )
      setEditorOpen(false)
      setRefresh((value) => value + 1)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save the record."
      setEditorError(message)
      authFailure(message)
    } finally {
      setSubmitting(false)
    }
  }
  const act = async () => {
    if (!confirm) return
    setWorking(true)
    try {
      if (confirm.action === "restore")
        await restoreMasterData(
          apiUrl,
          token(),
          organizationId,
          config,
          confirm.record.id
        )
      else
        await deleteMasterData(
          apiUrl,
          token(),
          organizationId,
          config,
          confirm.record.id,
          confirm.action === "permanent"
        )
      if (confirm.action === "delete") setRecentlyDeleted(confirm.record)
      else if (recentlyDeleted?.id === confirm.record.id)
        setRecentlyDeleted(null)
      toast.success(
        confirm.action === "restore"
          ? "Record restored successfully."
          : confirm.action === "permanent"
            ? "Record deleted permanently."
            : "Record moved to recently deleted."
      )
      setConfirm(null)
      setRefresh((value) => value + 1)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to complete the action."
      if (!authFailure(message)) toast.error(message)
    } finally {
      setWorking(false)
    }
  }
  const download = async () => {
    try {
      const blob = await downloadTemplate(
        apiUrl,
        token(),
        organizationId,
        config
      )
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = `${config.slug}-upload-template.csv`
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to download the template."
      )
    }
  }
  const upload = async (file?: File) => {
    if (!file) return
    try {
      const result = await uploadTemplate(
        apiUrl,
        token(),
        organizationId,
        config,
        file
      )
      toast.success(
        `${result.inserted} inserted, ${result.skipped} skipped${result.errors.length ? `, ${result.errors.length} row errors` : ""}.`
      )
      setRefresh((value) => value + 1)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to upload the template."
      )
    } finally {
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }
  const total = meta?.total ?? records.length
  const active = useMemo(
    () => records.filter((record) => record.isActive).length,
    [records]
  )

  const openCreate = () => {
    setEditorMode("create")
    setEditingId(undefined)
    setEditorValues(defaultValues(config))
    setEditorError("")
    setEditorOpen(true)
  }
  const triggerRefresh = () => setRefresh((value) => value + 1)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-4 sm:p-8 sm:py-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                    HR &amp; Payroll · Core
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {config.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {config.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      {total} total
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {active} active
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {deletedMeta?.total ?? 0} deleted
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <AppRefreshButton
                    triggerRefresh={triggerRefresh}
                    title="Refresh"
                  />
                  <AppAddNewButton
                    openCreateDialog={openCreate}
                    title={`New ${config.singular}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeleted ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted {config.singular}
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {recentlyDeleted.name} was soft deleted and can still be
                      restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                      onClick={() =>
                        setConfirm({
                          record: recentlyDeleted,
                          action: "restore",
                        })
                      }
                    >
                      <Undo2 className="size-3.5" />
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() =>
                        setConfirm({
                          record: recentlyDeleted,
                          action: "permanent",
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!organizationId ? (
            <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Select an organization to manage {config.singular} records.
              </CardContent>
            </Card>
          ) : (
            <>
              <input
                ref={uploadRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => void upload(event.target.files?.[0])}
              />
              <RecordsCard
                config={config}
                title={`${config.title.replace(" Setup", "")} table`}
                records={records}
                meta={meta}
                loading={loading}
                page={page}
                onPage={setPage}
                onEdit={(id) => void openEdit(id)}
                onDelete={(record) => setConfirm({ record, action: "delete" })}
                onRestore={() => undefined}
                onPermanent={() => undefined}
                headerActions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => void download()}
                    >
                      <Download className="size-3.5" />
                      Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => uploadRef.current?.click()}
                    >
                      <Upload className="size-3.5" />
                      Upload
                    </Button>
                  </>
                }
                filters={
                  <AppDataFilterForm
                    fields={[
                      {
                        id: `${config.slug}-search`,
                        label: "Code or name",
                        kind: "text",
                        value: search,
                        placeholder: "Input code or name",
                        className: "min-w-0 space-y-1 xl:col-span-2",
                        onValueChange: setSearch,
                      },
                      {
                        id: `${config.slug}-status`,
                        label: "Status",
                        kind: "select",
                        value: status || ALL_STATUS_VALUE,
                        placeholder: "All statuses",
                        options: [
                          { value: ALL_STATUS_VALUE, label: "All statuses" },
                          { value: "true", label: "Active" },
                          { value: "false", label: "Inactive" },
                        ],
                        onValueChange: (value) =>
                          setStatus(value === ALL_STATUS_VALUE ? "" : value),
                      },
                    ]}
                    onSubmit={() => setPage(1)}
                    onReset={() => {
                      setSearch("")
                      setStatus("")
                      setPage(1)
                    }}
                    onCreate={openCreate}
                  />
                }
              />
              <RecordsCard
                config={config}
                title={`Deleted ${config.title.replace(" Setup", "").toLowerCase()} records`}
                records={deleted}
                meta={deletedMeta}
                loading={loading}
                deleted
                page={deletedPage}
                onPage={setDeletedPage}
                onEdit={() => undefined}
                onDelete={() => undefined}
                onRestore={(record) =>
                  setConfirm({ record, action: "restore" })
                }
                onPermanent={(record) =>
                  setConfirm({ record, action: "permanent" })
                }
                filters={
                  <AppDataFilterForm
                    fields={[
                      {
                        id: `deleted-${config.slug}-search`,
                        label: "Code or name",
                        kind: "text",
                        value: deletedSearch,
                        placeholder: "Input code or name",
                        className: "min-w-0 space-y-1 xl:col-span-2",
                        onValueChange: setDeletedSearch,
                      },
                      {
                        id: `deleted-${config.slug}-status`,
                        label: "Status",
                        kind: "select",
                        value: deletedStatus || ALL_STATUS_VALUE,
                        placeholder: "All statuses",
                        options: [
                          { value: ALL_STATUS_VALUE, label: "All statuses" },
                          { value: "true", label: "Active" },
                          { value: "false", label: "Inactive" },
                        ],
                        onValueChange: (value) =>
                          setDeletedStatus(
                            value === ALL_STATUS_VALUE ? "" : value
                          ),
                      },
                    ]}
                    onSubmit={() => setDeletedPage(1)}
                    onReset={() => {
                      setDeletedSearch("")
                      setDeletedStatus("")
                      setDeletedPage(1)
                    }}
                  />
                }
              />
            </>
          )}
        </div>
      </ScrollArea>
      <FormDialog
        config={config}
        open={editorOpen}
        mode={editorMode}
        initial={editorValues}
        loading={editorLoading}
        submitting={submitting}
        error={editorError}
        onOpenChange={setEditorOpen}
        onValuesChange={setEditorValues}
        onSubmit={(values) => void submit(values)}
      />
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "restore"
                ? "Restore record"
                : confirm?.action === "permanent"
                  ? "Delete permanently"
                  : "Delete record"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "permanent"
                ? "This action cannot be undone."
                : confirm?.action === "restore"
                  ? "The record will return to the current list."
                  : "The record can be restored from the recently deleted section."}{" "}
              {confirm?.record.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={
                confirm?.action === "restore" ? "default" : "destructive"
              }
              disabled={working}
              onClick={() => void act()}
            >
              {working ? <Loader2 className="animate-spin" /> : null}
              {confirm?.action === "restore" ? "Restore" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
