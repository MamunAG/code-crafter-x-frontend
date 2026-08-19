"use client"

import { type ReactNode } from "react"
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type AppDataSectionProps<TData> = {
  title: ReactNode
  description?: ReactNode
  data: TData[]
  columns: ColumnDef<TData>[]
  loading?: boolean
  filters?: ReactNode
  headerActions?: ReactNode
  headerBadges?: ReactNode
  emptyState?: ReactNode
  mobileEmptyState?: ReactNode
  renderMobileItem?: (item: TData, index: number) => ReactNode
  getRowId?: (item: TData, index: number) => string
  pageSummary?: string
  page?: number
  totalPages?: number
  pageSize?: number
  pageSizeOptions?: number[]
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  controlsDisabled?: boolean
  loadingRows?: number
  mobileSkeletonClassName?: string
  leadingColumnIds?: string[]
  trailingColumnIds?: string[]
  columnClassNames?: Record<string, string>
}

export function AppDataSection<TData>({
  title,
  description,
  data,
  columns,
  loading = false,
  filters,
  headerActions,
  headerBadges,
  emptyState,
  mobileEmptyState,
  renderMobileItem,
  getRowId,
  pageSummary = "",
  page = 1,
  totalPages = 1,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  controlsDisabled = false,
  loadingRows = 5,
  mobileSkeletonClassName = "h-32 rounded-2xl",
  leadingColumnIds,
  trailingColumnIds,
  columnClassNames,
}: AppDataSectionProps<TData>) {
  // TanStack Table intentionally returns non-memoizable functions; the table stays local to this render boundary.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {headerBadges || headerActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {headerBadges}
              {headerActions}
            </div>
          ) : null}
        </div>
      </CardHeader>

      {filters ? <CardContent className="p-3 sm:p-0 sm:px-2">{filters}</CardContent> : null}

      <CardContent className={filters ? "border-t border-slate-200/70 p-0 dark:border-white/10" : "p-0"}>
        {renderMobileItem ? (
          <div className="lg:hidden">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: loadingRows }).map((_, index) => (
                  <Skeleton key={index} className={mobileSkeletonClassName} />
                ))}
              </div>
            ) : data.length > 0 ? (
              <div className="space-y-3 p-4">
                {data.map((item, index) => (
                  <div key={getRowId?.(item, index) ?? index}>{renderMobileItem(item, index)}</div>
                ))}
              </div>
            ) : (
              <div className="p-4">{mobileEmptyState ?? emptyState}</div>
            )}

            <AppDataTable
              table={table}
              isLoading={false}
              controlsDisabled={controlsDisabled || loading}
              pageSummary={pageSummary}
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              loadingRows={0}
              hideTable
            />
          </div>
        ) : null}

        <div className={renderMobileItem ? "hidden lg:block" : undefined}>
          <AppDataTable
            table={table}
            isLoading={loading}
            controlsDisabled={controlsDisabled}
            emptyState={emptyState}
            pageSummary={pageSummary}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            loadingRows={loadingRows}
            leadingColumnIds={leadingColumnIds}
            trailingColumnIds={trailingColumnIds}
            columnClassNames={columnClassNames}
          />
        </div>
      </CardContent>
    </Card>
  )
}
