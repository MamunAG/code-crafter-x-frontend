"use client"

import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

const COLUMN_WIDTH_STORAGE_VERSION = 1
const DEFAULT_MIN_COLUMN_WIDTH = 56
const DEFAULT_MAX_COLUMN_WIDTH = 800
const DEFAULT_NON_RESIZABLE_COLUMN_IDS = ["select", "selection", "actions"]

type StoredColumnWidths = {
  version: number
  widths: Record<string, number>
}

export type AppDataTableProps<TData> = {
  table: TanStackTable<TData>
  isLoading?: boolean
  controlsDisabled?: boolean
  emptyState?: ReactNode
  pageSummary?: string
  page?: number
  totalPages?: number
  pageSize?: number
  pageSizeOptions?: number[]
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loadingRows?: number
  hideTable?: boolean
  leadingColumnIds?: string[]
  trailingColumnIds?: string[]
  columnClassNames?: Record<string, string>
  enableColumnResizing?: boolean
  columnResizeStorageKey?: string
  nonResizableColumnIds?: string[]
  minColumnWidth?: number
  maxColumnWidth?: number
}

function clampColumnWidth(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

function sameColumnWidths(
  left: Record<string, number>,
  right: Record<string, number>
) {
  const leftEntries = Object.entries(left)
  const rightEntries = Object.entries(right)
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([id, width]) => right[id] === width)
  )
}

export function AppDataTable<TData>({
  table,
  isLoading = false,
  controlsDisabled = false,
  emptyState = null,
  pageSummary = "",
  page = 1,
  totalPages = 1,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  loadingRows = 5,
  hideTable = false,
  leadingColumnIds = ["color"],
  trailingColumnIds = ["actions"],
  columnClassNames,
  enableColumnResizing = true,
  columnResizeStorageKey,
  nonResizableColumnIds = [],
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  maxColumnWidth = DEFAULT_MAX_COLUMN_WIDTH,
}: AppDataTableProps<TData>) {
  const pathname = usePathname()
  const initializationFrameRef = useRef<number | null>(null)
  const initializationObserverRef = useRef<ResizeObserver | null>(null)
  const resizeCleanupRef = useRef<(() => void) | null>(null)
  const defaultWidthsRef = useRef<Record<string, number>>({})
  const customWidthsRef = useRef<Record<string, number>>({})
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [activeResizeColumnId, setActiveResizeColumnId] = useState<
    string | null
  >(null)
  const hasRows = table.getRowModel().rows.length > 0
  const safeTotalPages = Math.max(1, totalPages)
  const isFirstPage = page <= 1
  const isLastPage = page >= safeTotalPages
  const areControlsDisabled = isLoading || controlsDisabled
  const isLeadingColumn = (columnId: string) =>
    leadingColumnIds.includes(columnId)
  const isTrailingColumn = (columnId: string) =>
    trailingColumnIds.includes(columnId)
  const visibleColumns = table.getVisibleLeafColumns()
  const columnSignature = visibleColumns.map((column) => column.id).join("|")
  const storageKey = useMemo(() => {
    const identity = columnResizeStorageKey
      ? `custom:${columnResizeStorageKey}`
      : `route:${pathname || "/"}:columns:${columnSignature}`
    return `app-data-table:column-widths:v${COLUMN_WIDTH_STORAGE_VERSION}:${identity}`
  }, [columnResizeStorageKey, columnSignature, pathname])
  const excludedResizeColumns = useMemo(
    () =>
      new Set([...DEFAULT_NON_RESIZABLE_COLUMN_IDS, ...nonResizableColumnIds]),
    [nonResizableColumnIds]
  )
  const totalColumnWidth = enableColumnResizing
    ? visibleColumns.reduce(
        (total, column) => total + (columnWidths[column.id] ?? 0),
        0
      )
    : 0

  const persistCustomWidths = useCallback(
    (widths: Record<string, number>) => {
      customWidthsRef.current = widths
      try {
        if (Object.keys(widths).length === 0) {
          window.localStorage.removeItem(storageKey)
          return
        }
        const stored: StoredColumnWidths = {
          version: COLUMN_WIDTH_STORAGE_VERSION,
          widths,
        }
        window.localStorage.setItem(storageKey, JSON.stringify(stored))
      } catch {
        // Storage can be unavailable in private browsing or restricted contexts.
      }
    },
    [storageKey]
  )

  const initializeTableWidths = useCallback(
    (node: HTMLTableElement | null) => {
      initializationObserverRef.current?.disconnect()
      initializationObserverRef.current = null
      if (initializationFrameRef.current !== null) {
        window.cancelAnimationFrame(initializationFrameRef.current)
        initializationFrameRef.current = null
      }
      if (!node || !enableColumnResizing) return

      const measureWidths = () => {
        initializationFrameRef.current = null
        if (node.getBoundingClientRect().width <= 0) {
          if (typeof ResizeObserver === "undefined") return
          const observer = new ResizeObserver(() => {
            if (node.getBoundingClientRect().width <= 0) return
            observer.disconnect()
            initializationObserverRef.current = null
            initializationFrameRef.current =
              window.requestAnimationFrame(measureWidths)
          })
          initializationObserverRef.current = observer
          observer.observe(node)
          return
        }
        const measuredWidths: Record<string, number> = {}
        node
          .querySelectorAll<HTMLTableCellElement>("th[data-column-id]")
          .forEach((header) => {
            const id = header.dataset.columnId
            if (!id) return
            measuredWidths[id] = Math.max(
              1,
              Math.round(header.getBoundingClientRect().width)
            )
          })
        if (Object.keys(measuredWidths).length === 0) return

        defaultWidthsRef.current = measuredWidths
        let savedWidths: Record<string, number> = {}
        try {
          const raw = window.localStorage.getItem(storageKey)
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<StoredColumnWidths>
            if (
              parsed.version === COLUMN_WIDTH_STORAGE_VERSION &&
              parsed.widths &&
              typeof parsed.widths === "object"
            ) {
              savedWidths = Object.fromEntries(
                Object.entries(parsed.widths).filter(
                  ([id, width]) =>
                    id in measuredWidths &&
                    typeof width === "number" &&
                    Number.isFinite(width) &&
                    width >= minColumnWidth &&
                    width <= maxColumnWidth
                )
              )
            }
          }
        } catch {
          savedWidths = {}
        }
        customWidthsRef.current = savedWidths
        const nextWidths = { ...measuredWidths, ...savedWidths }
        setColumnWidths((current) =>
          sameColumnWidths(current, nextWidths) ? current : nextWidths
        )
      }
      initializationFrameRef.current =
        window.requestAnimationFrame(measureWidths)
    },
    [enableColumnResizing, maxColumnWidth, minColumnWidth, storageKey]
  )

  useEffect(
    () => () => {
      if (initializationFrameRef.current !== null) {
        window.cancelAnimationFrame(initializationFrameRef.current)
      }
      initializationObserverRef.current?.disconnect()
      resizeCleanupRef.current?.()
    },
    []
  )

  const setAndPersistColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const nextWidth = clampColumnWidth(width, minColumnWidth, maxColumnWidth)
      setColumnWidths((current) => ({ ...current, [columnId]: nextWidth }))
      persistCustomWidths({
        ...customWidthsRef.current,
        [columnId]: nextWidth,
      })
    },
    [maxColumnWidth, minColumnWidth, persistCustomWidths]
  )

  const startColumnResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, columnId: string) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      resizeCleanupRef.current?.()

      const startX = event.clientX
      const startWidth =
        columnWidths[columnId] ??
        defaultWidthsRef.current[columnId] ??
        minColumnWidth
      let latestWidth = startWidth
      setActiveResizeColumnId(columnId)
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        latestWidth = clampColumnWidth(
          startWidth + pointerEvent.clientX - startX,
          minColumnWidth,
          maxColumnWidth
        )
        setColumnWidths((current) => ({
          ...current,
          [columnId]: latestWidth,
        }))
      }
      const removeResizeListeners = () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", finishResize)
        window.removeEventListener("pointercancel", finishResize)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        resizeCleanupRef.current = null
      }
      const finishResize = () => {
        removeResizeListeners()
        setActiveResizeColumnId(null)
        persistCustomWidths({
          ...customWidthsRef.current,
          [columnId]: latestWidth,
        })
      }
      resizeCleanupRef.current = removeResizeListeners
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", finishResize)
      window.addEventListener("pointercancel", finishResize)
    },
    [columnWidths, maxColumnWidth, minColumnWidth, persistCustomWidths]
  )

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, columnId: string) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      event.stopPropagation()
      const step = event.shiftKey ? 20 : 4
      const direction = event.key === "ArrowRight" ? 1 : -1
      const currentWidth =
        columnWidths[columnId] ??
        defaultWidthsRef.current[columnId] ??
        minColumnWidth
      setAndPersistColumnWidth(columnId, currentWidth + step * direction)
    },
    [columnWidths, minColumnWidth, setAndPersistColumnWidth]
  )

  const resetColumnWidth = useCallback(
    (columnId: string) => {
      const defaultWidth = defaultWidthsRef.current[columnId]
      if (!defaultWidth) return
      setColumnWidths((current) => ({
        ...current,
        [columnId]: defaultWidth,
      }))
      const { [columnId]: _removed, ...remainingWidths } =
        customWidthsRef.current
      void _removed
      persistCustomWidths(remainingWidths)
    },
    [persistCustomWidths]
  )

  return (
    <div className="overflow-hidden">
      {hideTable ? null : isLoading ? (
        <div className="space-y-3 p-4 sm:p-6">
          {Array.from({ length: loadingRows }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : hasRows ? (
        <Table
          ref={initializeTableWidths}
          style={
            totalColumnWidth > 0
              ? { width: totalColumnWidth, minWidth: "100%" }
              : undefined
          }
        >
          {totalColumnWidth > 0 ? (
            <colgroup>
              {visibleColumns.map((column) => (
                <col
                  key={column.id}
                  style={{ width: columnWidths[column.id] }}
                />
              ))}
            </colgroup>
          ) : null}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    data-column-id={header.column.id}
                    style={
                      enableColumnResizing && columnWidths[header.column.id]
                        ? { width: columnWidths[header.column.id] }
                        : undefined
                    }
                    className={cn(
                      "group/column-header relative",
                      isLeadingColumn(header.column.id)
                        ? "pl-4"
                        : isTrailingColumn(header.column.id)
                          ? "pr-4 text-right"
                          : undefined,
                      columnClassNames?.[header.column.id]
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {enableColumnResizing &&
                    header.colSpan === 1 &&
                    header.column.columnDef.enableResizing !== false &&
                    (!excludedResizeColumns.has(header.column.id) ||
                      header.column.columnDef.enableResizing === true) ? (
                      <div
                        role="separator"
                        aria-label={`Resize ${header.column.id} column`}
                        aria-orientation="vertical"
                        aria-valuemin={minColumnWidth}
                        aria-valuemax={maxColumnWidth}
                        aria-valuenow={
                          columnWidths[header.column.id] ?? minColumnWidth
                        }
                        tabIndex={0}
                        data-active={
                          activeResizeColumnId === header.column.id
                            ? "true"
                            : "false"
                        }
                        className={cn(
                          "absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none opacity-0 transition-opacity outline-none select-none group-hover/column-header:opacity-100 after:absolute after:inset-y-1 after:right-0 after:w-0.5 after:rounded-full after:bg-primary/70 focus-visible:opacity-100 focus-visible:after:bg-primary data-[active=true]:opacity-100 data-[active=true]:after:bg-primary"
                        )}
                        onPointerDown={(event) =>
                          startColumnResize(event, header.column.id)
                        }
                        onKeyDown={(event) =>
                          handleResizeKeyDown(event, header.column.id)
                        }
                        onDoubleClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          resetColumnWidth(header.column.id)
                        }}
                      />
                    ) : null}
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
                    style={
                      enableColumnResizing && columnWidths[cell.column.id]
                        ? { width: columnWidths[cell.column.id] }
                        : undefined
                    }
                    className={cn(
                      isLeadingColumn(cell.column.id)
                        ? "pl-4"
                        : isTrailingColumn(cell.column.id)
                          ? "pr-4 text-right"
                          : undefined,
                      columnClassNames?.[cell.column.id]
                    )}
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

      <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10">
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
                disabled={areControlsDisabled}
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
              disabled={areControlsDisabled || isFirstPage}
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
              disabled={areControlsDisabled || isFirstPage}
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
              disabled={areControlsDisabled || isLastPage}
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
              disabled={areControlsDisabled || isLastPage}
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
