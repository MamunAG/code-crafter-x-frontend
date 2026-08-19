"use client"

import { useMemo } from "react"
import { Download, MoreHorizontal, Plus, Upload } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"

import { AppDataSection } from "@/components/app-data-section"
import { AppDataFilterForm } from "@/components/app-data-filter-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import type { DesignationFilterValues, DesignationRecord, PaginationMeta } from "../designation.types"

const ALL_STATUS_VALUE = "__all_statuses__"

type ActiveDesignationSectionProps = {
  data: DesignationRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  filters: DesignationFilterValues
  onFilterChange: (nextValues: DesignationFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreate: () => void
  onEdit: (designationId: string) => void
  onDelete: (designation: DesignationRecord) => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  downloadingTemplate: boolean
  uploadingTemplate: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getStatusLabel(designation: DesignationRecord) {
  if (designation.deleted_at) return "Deleted"
  return designation.isActive === false ? "Inactive" : "Active"
}

function getStatusTone(designation: DesignationRecord) {
  if (designation.deleted_at) return "destructive" as const
  return designation.isActive === false ? "outline" as const : "secondary" as const
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Plus className="size-5" /></div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">{actionLabel}</Button>
    </div>
  )
}

export function ActiveDesignationSection({
  data, meta, page, limit, loading, filters, onFilterChange, onPageChange, onLimitChange,
  onCreate, onEdit, onDelete, onDownloadTemplate, onUploadTemplate, downloadingTemplate, uploadingTemplate,
}: ActiveDesignationSectionProps) {
  const filterCount = useMemo(() => [filters.designationName, filters.isActive].filter((value) => value.trim()).length, [filters])
  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No designations found"
    const start = (meta.page - 1) * meta.limit + 1
    return `Showing ${start}-${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`
  }, [meta])

  const clearFilters = () => {
    onFilterChange({ designationName: "", isActive: "" })
    onPageChange(1)
  }

  const columns = useMemo<ColumnDef<DesignationRecord>[]>(() => [
    {
      id: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <div className="pl-4"><div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">{(row.original.designationName?.trim() || "?").charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.designationName}</p><p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.description || "No description"}</p></div></div></div>
      ),
    },
    { id: "status", header: "Status", cell: ({ row }) => <Badge variant={getStatusTone(row.original)} className="rounded-full px-3 py-1">{getStatusLabel(row.original)}</Badge> },
    { id: "created", header: "Created", cell: ({ row }) => <span className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.created_at)}</span> },
    { id: "updated", header: "Updated", cell: ({ row }) => <span className="text-xs text-slate-700 dark:text-slate-200">{row.original.updated_by_id || row.original.updated_by_user ? formatDate(row.original.updated_at) : "Not edited yet"}</span> },
    {
      id: "actions",
      header: () => <span className="pr-4">Actions</span>,
      cell: ({ row }) => <div className="pr-4 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /><span className="sr-only">Open actions</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onSelect={() => onEdit(row.original.id)}>Edit designation</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>Delete designation</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>,
    },
  ], [onDelete, onEdit])

  const emptyState = <EmptyState title="No designations found" description="Try clearing or relaxing the current filters." actionLabel="Reset" onAction={clearFilters} />

  return (
    <AppDataSection
      title="Designations table"
      description={pageSummary}
      data={data}
      columns={columns}
      loading={loading}
      pageSummary={pageSummary}
      page={page}
      totalPages={meta?.totalPages ?? 1}
      pageSize={limit}
      pageSizeOptions={[5, 10, 25, 50]}
      onPageChange={(nextPage) => onPageChange(nextPage)}
      onPageSizeChange={(nextPageSize) => { onLimitChange(nextPageSize); onPageChange(1) }}
      getRowId={(designation) => designation.id}
      emptyState={emptyState}
      mobileEmptyState={emptyState}
      headerBadges={<><Badge variant="outline" className="w-fit rounded-full px-3 py-1">Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}</Badge><Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">{filterCount} active filter{filterCount === 1 ? "" : "s"}</Badge></>}
      headerActions={<DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" className="rounded-full" disabled={downloadingTemplate || uploadingTemplate}><MoreHorizontal className="size-2.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}><Download className="mr-2 size-3.5" />{downloadingTemplate ? "Downloading template..." : "Download template"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}><Upload className="mr-2 size-3.5" />{uploadingTemplate ? "Uploading designations..." : "Upload designations"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
      filters={<AppDataFilterForm fields={[{ id: "filterDesignationName", label: "Designation name", kind: "text", value: filters.designationName, placeholder: "Input designation name", className: "min-w-0 space-y-1 xl:col-span-2", onValueChange: (designationName) => onFilterChange({ ...filters, designationName }) }, { id: "filterDesignationStatus", label: "Status", kind: "select", value: filters.isActive || ALL_STATUS_VALUE, placeholder: "All statuses", options: [{ value: ALL_STATUS_VALUE, label: "All statuses" }, { value: "true", label: "Active" }, { value: "false", label: "Inactive" }], onValueChange: (value) => onFilterChange({ ...filters, isActive: value === ALL_STATUS_VALUE ? "" : value }) }]} onSubmit={() => onPageChange(1)} onReset={clearFilters} onCreate={onCreate} />}
      renderMobileItem={(designation) => <article className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{designation.designationName}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{designation.description || "No description"}</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="rounded-full"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onSelect={() => onEdit(designation.id)}>Edit designation</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => onDelete(designation)}>Delete designation</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="mt-3 flex flex-wrap gap-2"><Badge variant={getStatusTone(designation)} className="rounded-full px-3 py-1">{getStatusLabel(designation)}</Badge></div><div className="mt-4 text-xs text-slate-500 dark:text-slate-400"><p>Created: {formatDate(designation.created_at)}</p></div></article>}
    />
  )
}
