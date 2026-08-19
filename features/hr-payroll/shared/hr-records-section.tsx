"use client"

import { useMemo, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { AppDataFilterForm } from "@/components/app-data-filter-form"
import { AppDataSection } from "@/components/app-data-section"
import { Badge } from "@/components/ui/badge"

export type HrDisplayColumn<T> = {
  id: string
  header: string
  render: (record: T) => ReactNode
}

export function HrRecordsSection<T>({
  title,
  description,
  data,
  loading,
  columns: displayColumns,
  getRowId,
  search,
  onSearchChange,
  onRefresh,
  onCreate,
  createLabel,
  headerActions,
  page = 1,
  totalPages = 1,
  pageSize,
  onPageChange,
  onPageSizeChange,
  emptyMessage = "No records found.",
  renderMobileItem,
}: {
  title: string
  description?: string
  data: T[]
  loading?: boolean
  columns: HrDisplayColumn<T>[]
  getRowId: (record: T) => string
  search?: string
  onSearchChange?: (value: string) => void
  onRefresh?: () => void
  onCreate?: () => void
  createLabel?: string
  headerActions?: ReactNode
  page?: number
  totalPages?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  emptyMessage?: string
  renderMobileItem?: (record: T) => ReactNode
}) {
  const columns = useMemo<ColumnDef<T>[]>(
    () =>
      displayColumns.map((column) => ({
        id: column.id,
        header: column.header,
        cell: ({ row }) => column.render(row.original),
      })),
    [displayColumns]
  )
  const summary = data.length
    ? `${data.length} record${data.length === 1 ? "" : "s"} on this page`
    : emptyMessage
  const filters = onSearchChange ? (
    <AppDataFilterForm
      fields={[
        {
          id: `${title.replace(/\s/g, "")}-search`,
          label: "Search",
          kind: "text",
          value: search ?? "",
          placeholder: "Search records",
          className: "min-w-0 space-y-1 xl:col-span-3",
          onValueChange: onSearchChange,
        },
      ]}
      onSubmit={() => onPageChange?.(1)}
      onReset={() => {
        onSearchChange("")
        onPageChange?.(1)
        onRefresh?.()
      }}
      onCreate={onCreate}
      createLabel={createLabel}
    />
  ) : undefined
  return (
    <AppDataSection
      title={title}
      description={description ?? summary}
      data={data}
      columns={columns}
      loading={loading}
      filters={filters}
      headerActions={headerActions}
      headerBadges={
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
          {data.length} shown
        </Badge>
      }
      pageSummary={summary}
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      pageSizeOptions={pageSize ? [5, 10, 20, 50] : undefined}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      getRowId={getRowId}
      emptyState={
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      }
      mobileEmptyState={
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      }
      renderMobileItem={renderMobileItem}
    />
  )
}
