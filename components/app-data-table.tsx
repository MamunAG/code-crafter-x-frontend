"use client"

import { type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import {
  flexRender,
  type Table as TanStackTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AppDataTableProps<TData> = {
  table: TanStackTable<TData>
  isLoading?: boolean
  emptyState?: ReactNode
  pageSummary?: string
  page?: number
  totalPages?: number
  pageSize?: number
  pageSizeOptions?: number[]
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loadingRows?: number
  leadingColumnIds?: string[]
  trailingColumnIds?: string[]
}

export function AppDataTable<TData>({
  table,
  isLoading = false,
  emptyState = null,
  pageSummary = "",
  page = 1,
  totalPages = 1,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  loadingRows = 5,
  leadingColumnIds = ["color"],
  trailingColumnIds = ["actions"],
}: AppDataTableProps<TData>) {
  const hasRows = table.getRowModel().rows.length > 0
  const safeTotalPages = Math.max(1, totalPages)
  const isFirstPage = page <= 1
  const isLastPage = page >= safeTotalPages
  const isLeadingColumn = (columnId: string) => leadingColumnIds.includes(columnId)
  const isTrailingColumn = (columnId: string) => trailingColumnIds.includes(columnId)

  return (
    <div className="overflow-hidden">
      {isLoading ? (
        <div className="space-y-3 p-4 sm:p-6">
          {Array.from({ length: loadingRows }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : hasRows ? (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      isLeadingColumn(header.column.id)
                        ? "pl-4"
                        : isTrailingColumn(header.column.id)
                          ? "pr-4 text-right"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      isLeadingColumn(cell.column.id)
                        ? "pl-4"
                        : isTrailingColumn(cell.column.id)
                          ? "pr-4 text-right"
                          : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="p-4 sm:p-6">{emptyState}</div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pageSummary}
          </p>
          {pageSize != null && onPageSizeChange ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Rows
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger size="sm" className="w-20 rounded-xl">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {onPageChange ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => onPageChange(1)}
              disabled={isLoading || isFirstPage}
            >
              <ChevronsLeft className="size-3.5" />
              <span className="sr-only">Go to first page</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={isLoading || isFirstPage}
            >
              <ChevronLeft className="size-3.5" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
              disabled={isLoading || isLastPage}
            >
              <ChevronRight className="size-3.5" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => onPageChange(safeTotalPages)}
              disabled={isLoading || isLastPage}
            >
              <ChevronsRight className="size-3.5" />
              <span className="sr-only">Go to last page</span>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
