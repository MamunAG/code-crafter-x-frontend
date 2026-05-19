"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { ArrowLeft, FileSpreadsheet, Loader2, Printer, RefreshCcw, Search } from "lucide-react"

import { AppCombobox, type AppComboboxLoadParams, type AppComboboxLoadResult, type AppComboboxOption } from "@/components/app-combobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { fetchBuyers } from "@/features/merchandising/buyers/buyer.service"
import { fetchJobNumbersByBuyer } from "@/features/merchandising/jobs/job.service"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"
import { toast } from "sonner"

import { TnaFormDialog } from "./component/tna-form-dialog"
import type { ImportTnaOption, LoadImportTnaOptionsParams } from "./component/tna-import-dialog"
import { fetchTnaDetailRevisions, fetchTnaRecord, fetchTnaRecords, fetchTnaReport, fetchTnaTasks, updateTna } from "./tna.service"
import type { TnaDetailRecord, TnaDetailRevisionRecord, TnaFilterValues, TnaFormValues, TnaRecord, TnaTaskRecord } from "./tna.types"

type TaskColumn = {
  taskId: string
  label: string
  sortOrder: number
}

const DEFAULT_REPORT_FILTERS: TnaFilterValues = { buyerId: "", jobId: "", leadTime: "" }
const DEFAULT_FORM_VALUES: TnaFormValues = {
  buyerId: "",
  jobId: "",
  leadTime: "0",
  tnaDetails: [
    {
      id: crypto.randomUUID(),
      taskId: "",
      executionDate: "",
      days: "1",
      relationFormula: "",
      isPersisted: false,
      revisions: [],
    },
  ],
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function getBuyerLabel(record: TnaRecord) {
  return record.buyer?.displayName?.trim() || record.buyer?.name?.trim() || record.buyerId || "-"
}

function getJobLabel(record: TnaRecord) {
  return record.job?.jobNo?.trim() || record.jobId || "-"
}

function formatReportDate(value?: string | Date | null) {
  if (!value) return "-"

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"

  const day = parsed.getDate()
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(parsed)
  const year = String(parsed.getFullYear()).slice(-2)
  return `${day}-${month}-${year}`
}

function buildTaskColumns(records: TnaRecord[]) {
  const columnsByTaskId = new Map<string, TaskColumn>()

  for (const record of records) {
    for (const detail of record.tnaDetails ?? []) {
      const taskId = detail.taskId?.trim()
      if (!taskId) continue

      const currentColumn = columnsByTaskId.get(taskId)
      const sortOrder = Number(detail.sortOrder ?? 0)
      const label = detail.task?.name?.trim() || taskId

      if (!currentColumn || sortOrder < currentColumn.sortOrder) {
        columnsByTaskId.set(taskId, { taskId, label, sortOrder })
      }
    }
  }

  return [...columnsByTaskId.values()].sort((left, right) => {
    const sortDifference = left.sortOrder - right.sortOrder
    return sortDifference || left.label.localeCompare(right.label)
  })
}

function getDetailsByTaskId(record: TnaRecord) {
  return (record.tnaDetails ?? []).reduce<Record<string, TnaDetailRecord>>((detailsByTaskId, detail) => {
    if (detail.taskId) {
      detailsByTaskId[detail.taskId] = detail
    }
    return detailsByTaskId
  }, {})
}

function escapeExcelHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getRevisionLines(detail: TnaDetailRecord) {
  const revisions = [...(detail.revisions ?? [])].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0
    return leftTime - rightTime
  })

  if (!revisions.length) {
    return []
  }

  return [
    `${formatReportDate(revisions[0]?.previousExecutionDate)}: (Initial Date)`,
    ...revisions.map((revision) => `${formatReportDate(revision.newExecutionDate)}: (${revision.note?.trim() || "Revised Date"})`),
  ]
}

function getTaskCellLines(detail?: TnaDetailRecord) {
  if (!detail) {
    return ["-"]
  }

  return [formatReportDate(detail.executionDate), ...getRevisionLines(detail)]
}

function ReportTaskCell({ detail }: { detail?: TnaDetailRecord }) {
  if (!detail) {
    return <span className="text-slate-300 dark:text-slate-600">-</span>
  }

  const revisionLines = getRevisionLines(detail)

  return (
    <div className="min-w-24 text-center text-xs leading-4 print:min-w-0 print:text-[8px] print:leading-3">
      <div className="whitespace-nowrap">{formatReportDate(detail.executionDate)}</div>
      {revisionLines.length ? (
        <div className="mt-0.5 divide-y divide-slate-200 border-t border-slate-200 text-left text-xs leading-4 print:text-[8px] print:leading-3 dark:divide-white/10 dark:border-white/10">
          {revisionLines.map((line, index) => (
            <div key={`${line}-${index}`} className="px-0.5 text-slate-700 dark:text-slate-200">
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TnaReportWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() => (typeof window === "undefined" ? "" : readSelectedOrganizationId()))
  const [records, setRecords] = useState<TnaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [draftFilters, setDraftFilters] = useState<TnaFilterValues>(DEFAULT_REPORT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<TnaFilterValues>(DEFAULT_REPORT_FILTERS)
  const [selectedBuyer, setSelectedBuyer] = useState<AppComboboxOption | null>(null)
  const [selectedJob, setSelectedJob] = useState<AppComboboxOption | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorValues, setEditorValues] = useState<TnaFormValues>(DEFAULT_FORM_VALUES)
  const [initialBuyer, setInitialBuyer] = useState<AppComboboxOption | null>(null)
  const [initialJob, setInitialJob] = useState<AppComboboxOption | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [taskOptions, setTaskOptions] = useState<TnaTaskRecord[]>([])
  const [taskOptionsLoading, setTaskOptionsLoading] = useState(true)
  const selectedBuyerId = draftFilters.buyerId.trim()

  const handleAuthFailure = useCallback(
    (message: string) => {
      if (!normalizeAuthFailure(message)) return false
      window.localStorage.removeItem("access_token")
      window.localStorage.removeItem("refresh_token")
      window.localStorage.removeItem("auth_user")
      router.replace("/sign-in")
      return true
    },
    [router],
  )

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      const reportRecords = await fetchTnaReport({
        apiUrl,
        accessToken: token,
        filters: activeFilters,
        organizationId: selectedOrganizationId || undefined,
      })

      setRecords(reportRecords)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to load TNA report right now."
      if (handleAuthFailure(message)) {
        return
      }
      setError(message)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [activeFilters, apiUrl, handleAuthFailure, selectedOrganizationId])

  const loadBuyerOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      const response = await fetchBuyers({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: { name: query, isActive: "true" },
        organizationId: selectedOrganizationId || undefined,
      })

      return {
        items: response.items.map((buyer) => ({
          value: buyer.id,
          label: buyer.displayName?.trim() || buyer.name,
        })),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadJobOptions = useCallback(
    async ({ query }: AppComboboxLoadParams, buyerId?: string): Promise<AppComboboxLoadResult<AppComboboxOption>> => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")
      const targetBuyerId = buyerId?.trim() || selectedBuyerId

      if (!targetBuyerId) {
        return {
          items: [],
          hasNextPage: false,
        }
      }

      const jobs = await fetchJobNumbersByBuyer({
        apiUrl,
        accessToken: token,
        buyerId: targetBuyerId,
        organizationId: selectedOrganizationId || undefined,
      })

      const normalizedQuery = query.trim().toLowerCase()
      const items = jobs
        .filter((job) => {
          if (!normalizedQuery) return true
          return (job.jobNo?.trim() || "").toLowerCase().includes(normalizedQuery)
        })
        .map((job) => ({
          value: job.id,
          label: job.jobNo?.trim() || job.id,
        }))

      return {
        items,
        hasNextPage: false,
      }
    },
    [apiUrl, selectedBuyerId, selectedOrganizationId],
  )

  const loadImportTnaOptions = useCallback(
    async ({ buyerId, jobId, leadTime, query, page, limit }: LoadImportTnaOptionsParams): Promise<AppComboboxLoadResult<ImportTnaOption>> => {
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) throw new Error("Your session expired. Please sign in again.")

        const normalizedQuery = query.trim().toLowerCase()
        const response = await fetchTnaRecords({
          apiUrl,
          accessToken: token,
          page: normalizedQuery ? 1 : page,
          limit: normalizedQuery ? 100 : limit,
          filters: { buyerId: buyerId ?? "", jobId: jobId ?? "", leadTime: leadTime ?? "" },
          organizationId: selectedOrganizationId || undefined,
        })

        const items = response.items
          .filter((record) => record.id !== editingId)
          .filter((record) => {
            if (!normalizedQuery) return true
            const createdAt = record.created_at ? String(record.created_at).slice(0, 10) : ""
            return `${record.id} ${createdAt} ${getBuyerLabel(record)} ${getJobLabel(record)}`.toLowerCase().includes(normalizedQuery)
          })
          .map((record) => {
            const createdAt = record.created_at ? String(record.created_at).slice(0, 10) : "saved TNA"
            const rowCount = record.tnaDetails?.length ?? 0

            return {
              value: record.id,
              label: `${createdAt} / ${rowCount} row${rowCount === 1 ? "" : "s"}`,
              record,
            }
          })

        return {
          items,
          hasNextPage: normalizedQuery ? false : response.meta.hasNextPage,
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load source TNA records right now."
        handleAuthFailure(message)
        throw caughtError
      }
    },
    [apiUrl, editingId, handleAuthFailure, selectedOrganizationId],
  )

  const loadImportTnaRecord = useCallback(
    async (id: string) => {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      return fetchTnaRecord({
        apiUrl,
        accessToken: token,
        id,
        organizationId: selectedOrganizationId || undefined,
      })
    },
    [apiUrl, selectedOrganizationId],
  )

  const loadDetailRevisions = useCallback(
    async (tnaId: string, detailId: string): Promise<TnaDetailRevisionRecord[]> => {
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) throw new Error("Your session expired. Please sign in again.")

        return await fetchTnaDetailRevisions({
          apiUrl,
          accessToken: token,
          tnaId,
          detailId,
          organizationId: selectedOrganizationId || undefined,
        })
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load revision history right now."
        handleAuthFailure(message)
        throw caughtError
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const openEditDialog = useCallback(
    async (id: string) => {
      setEditorLoading(true)
      setEditorError("")
      setEditorOpen(true)

      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const record = await fetchTnaRecord({
          apiUrl,
          accessToken: token,
          id,
          organizationId: selectedOrganizationId || undefined,
        })

        setEditingId(record.id)
        setEditorValues({
          buyerId: record.buyerId ?? "",
          jobId: record.jobId ?? "",
          leadTime: String(record.leadTime ?? 0),
          tnaDetails: (record.tnaDetails ?? []).map((detail) => ({
            id: detail.id || crypto.randomUUID(),
            taskId: detail.taskId ?? "",
            executionDate: detail.executionDate ? String(detail.executionDate).slice(0, 10) : "",
            days: String(detail.days ?? 0),
            sortOrder: detail.sortOrder ?? undefined,
            relationFormula: detail.relationFormula ?? "",
            isPersisted: true,
            revisions: [],
          })),
        })
        setInitialBuyer(record.buyerId ? { value: record.buyerId, label: getBuyerLabel(record) } : null)
        setInitialJob(record.jobId ? { value: record.jobId, label: record.job?.jobNo?.trim() || record.jobId } : null)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load the TNA record right now."
        if (!handleAuthFailure(message)) toast.error(message)
      } finally {
        setEditorLoading(false)
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  async function submitEditor(values: TnaFormValues) {
    if (editorSubmitting || editorLoading || !editingId) return

    setEditorSubmitting(true)
    setEditorError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await updateTna({
        apiUrl,
        accessToken: token,
        id: editingId,
        payload: values,
        organizationId: selectedOrganizationId || undefined,
      })

      toast.success("TNA updated successfully.")
      setEditorOpen(false)
      setEditorValues(DEFAULT_FORM_VALUES)
      setInitialBuyer(null)
      setInitialJob(null)
      setEditingId(null)
      setRefreshVersion((current) => current + 1)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to save the TNA right now."
      if (!handleAuthFailure(message)) {
        setEditorError(message)
        toast.error(message)
      }
    } finally {
      setEditorSubmitting(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadTasks() {
      setTaskOptionsLoading(true)
      try {
        const token = window.localStorage.getItem("access_token")
        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const response = await fetchTnaTasks({
          apiUrl,
          accessToken: token,
          page: 1,
          limit: 100,
          organizationId: selectedOrganizationId || undefined,
        })

        if (active) {
          setTaskOptions(response.items)
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load TNA tasks right now."
        if (!handleAuthFailure(message) && active) {
          setTaskOptions([])
        }
      } finally {
        if (active) setTaskOptionsLoading(false)
      }
    }

    const timeout = window.setTimeout(() => {
      void loadTasks()
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [apiUrl, handleAuthFailure, refreshVersion, selectedOrganizationId])

  useEffect(() => {
    function handleOrganizationChange(event: Event) {
      const nextOrganizationId = event instanceof CustomEvent ? event.detail?.organizationId : readSelectedOrganizationId()
      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadReport, refreshVersion])

  const taskColumns = useMemo(() => buildTaskColumns(records), [records])

  const handleExportExcel = useCallback(() => {
    const headerCells = ["Buyer", "Job", "Lead", ...taskColumns.map((task) => task.label)]
    const bodyRows = records.map((record) => {
      const detailsByTaskId = getDetailsByTaskId(record)
      const cells = [
        getBuyerLabel(record),
        getJobLabel(record),
        Number(record.leadTime ?? 0),
        ...taskColumns.map((task) => getTaskCellLines(detailsByTaskId[task.taskId]).join("<br>")),
      ]

      return `<tr>${cells.map((cell) => `<td>${escapeExcelHtml(cell).replaceAll("&lt;br&gt;", "<br>")}</td>`).join("")}</tr>`
    })

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; white-space: nowrap; }
            td { mso-number-format: "\\@"; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headerCells.map((cell) => `<th>${escapeExcelHtml(cell)}</th>`).join("")}</tr>
            </thead>
            <tbody>${bodyRows.join("")}</tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tna-report-${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [records, taskColumns])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden print:block print:h-auto print:overflow-visible">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .tna-report-print-section,
          .tna-report-print-section * {
            visibility: visible !important;
          }

          .tna-report-print-section {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          @page {
            size: landscape;
            margin: 5mm;
          }
        }
      `}</style>
      <ScrollArea className="h-full w-full print:h-auto">
        <div className="min-w-0 space-y-5 p-3 sm:p-4 lg:p-6 print:space-y-4 print:p-0">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur print:hidden dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Merchandising production</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">TNA Report</h1>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Right-click a report row for context actions.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 print:hidden">
                  <Button type="button" variant="outline" onClick={() => router.push("/merchandising/production/tna")} className="rounded-xl">
                    <ArrowLeft className="size-3.5" />
                    Back
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.print()} className="rounded-xl">
                    <Printer className="size-3.5" />
                    Print
                  </Button>
                  <Button type="button" variant="outline" onClick={handleExportExcel} disabled={!records.length} className="rounded-xl">
                    <FileSpreadsheet className="size-3.5" />
                    Excel
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setRefreshVersion((current) => current + 1)} className="rounded-xl">
                    <RefreshCcw className="size-3.5" />
                    Refresh
                  </Button>
                </div>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setActiveFilters(draftFilters)
                }}
                className="mt-3 flex gap-2 items-end print:hidden"
              >
                <div className="min-w-0 max-w-44 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Buyer</label>
                  <AppCombobox
                    value={draftFilters.buyerId && selectedBuyer?.value === draftFilters.buyerId ? selectedBuyer : null}
                    onValueChange={(buyer) => {
                      setSelectedBuyer(buyer)
                      setSelectedJob(null)
                      setDraftFilters({ ...draftFilters, buyerId: buyer?.value ?? "", jobId: "" })
                    }}
                    loadItems={loadBuyerOptions}
                    initialLimit={10}
                    searchLimit={10}
                    placeholder="All buyers"
                    loadingMessage="Loading buyers..."
                    emptyMessage="No buyers match your search."
                    showClear={Boolean(draftFilters.buyerId)}
                    inputClassName="h-7 rounded-md px-2 text-xs"
                    contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                  />
                </div>

                <div className="min-w-0 max-w-44 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Job</label>
                  <AppCombobox
                    key={selectedBuyerId || "tna-report-buyer-empty"}
                    value={draftFilters.jobId && selectedJob?.value === draftFilters.jobId ? selectedJob : null}
                    onValueChange={(job) => {
                      setSelectedJob(job)
                      setDraftFilters({ ...draftFilters, jobId: job?.value ?? "" })
                    }}
                    loadItems={loadJobOptions}
                    initialLimit={10}
                    searchLimit={10}
                    placeholder={selectedBuyerId ? "All jobs" : "Select buyer first"}
                    loadingMessage="Loading jobs..."
                    emptyMessage={selectedBuyerId ? "No jobs match your search." : "Select a buyer to load matching jobs."}
                    showClear={Boolean(draftFilters.jobId)}
                    disabled={!selectedBuyerId}
                    inputClassName="h-7 rounded-md px-2 text-xs"
                    contentClassName="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"
                  />
                </div>

                <div className="min-w-0 space-y-1 pb-1">
                  <label htmlFor="tna-report-lead-time-filter" className="text-xs font-medium text-slate-700 dark:text-slate-300">Lead time</label>
                  <Input
                    id="tna-report-lead-time-filter"
                    value={draftFilters.leadTime ?? ""}
                    onChange={(event) => {
                      setDraftFilters({ ...draftFilters, leadTime: event.target.value.replace(/\D/g, "") })
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="All lead times"
                    className="h-7 rounded-md px-2 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end sm:justify-end lg:col-span-1 pb-1">
                  <Button type="submit" className="w-full rounded-xl sm:w-auto">
                    <Search className="size-3.5" />
                    Search
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto px-4"
                    onClick={() => {
                      setSelectedBuyer(null)
                      setSelectedJob(null)
                      setDraftFilters(DEFAULT_REPORT_FILTERS)
                      setActiveFilters(DEFAULT_REPORT_FILTERS)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 print:hidden dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex h-56 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-500 print:hidden dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              Loading TNA report...
            </div>
          ) : records.length > 0 ? (
            <div className="tna-report-print-section min-w-0 space-y-0 print:space-y-1">
              {records.map((record) => {
                const detailsByTaskId = getDetailsByTaskId(record)
                const recordTaskColumns = buildTaskColumns([record])
                const recordTableMinWidth = Math.max(520, 200 + recordTaskColumns.length * 104)

                return (
                  <ContextMenu key={record.id}>
                    <ContextMenuTrigger asChild className="select-text">
                      <ScrollArea
                        className="group w-full max-w-full min-w-0 select-text rounded-none bg-white print:break-inside-avoid print:overflow-visible dark:bg-slate-950/50"
                        viewportClassName="w-full pb-3 print:overflow-visible print:pb-0"
                      >
                        <table className="w-full table-fixed select-text border-separate border-spacing-0 text-xs print:text-[8px]" style={{ minWidth: recordTableMinWidth }}>
                          <thead>
                            <tr className="bg-slate-50 text-slate-950 dark:bg-white/4 dark:text-slate-50">
                              <th className="w-20 border-b border-r border-t border-slate-300 px-1.5 py-1 text-center text-xs font-bold first:border-l print:w-14 print:px-0.5 print:py-0.5 print:text-[8px] dark:border-white/15">Buyer</th>
                              <th className="w-20 border-b border-r border-t border-slate-300 px-1.5 py-1 text-center text-xs font-bold print:w-14 print:px-0.5 print:py-0.5 print:text-[8px] dark:border-white/15">Job</th>
                              <th className="w-16 border-b border-r border-t border-slate-300 px-1.5 py-1 text-center text-xs font-bold print:w-10 print:px-0.5 print:py-0.5 print:text-[8px] dark:border-white/15">Lead</th>
                              {recordTaskColumns.map((task) => (
                                <th key={task.taskId} className="border-b border-r border-t border-slate-300 px-1.5 py-1 text-center text-xs font-bold print:px-0.5 print:py-0.5 print:text-[8px] dark:border-white/15">
                                  {task.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border-b border-r border-slate-300 px-1.5 py-1 text-center text-xs transition-colors first:border-l group-hover:bg-emerald-50 print:px-0.5 print:py-0.5 print:text-[8px] print:group-hover:bg-transparent dark:border-white/15 dark:group-hover:bg-emerald-500/10">{getBuyerLabel(record)}</td>
                              <td className="border-b border-r border-slate-300 px-1.5 py-1 text-center text-xs transition-colors group-hover:bg-emerald-50 print:px-0.5 print:py-0.5 print:text-[8px] print:group-hover:bg-transparent dark:border-white/15 dark:group-hover:bg-emerald-500/10">{getJobLabel(record)}</td>
                              <td className="border-b border-r border-slate-300 px-1.5 py-1 text-center text-xs transition-colors group-hover:bg-emerald-50 print:px-0.5 print:py-0.5 print:text-[8px] print:group-hover:bg-transparent dark:border-white/15 dark:group-hover:bg-emerald-500/10">{Number(record.leadTime ?? 0)}</td>
                              {recordTaskColumns.map((task) => (
                                <td key={task.taskId} className="border-b border-r border-slate-300 px-1 py-1 align-middle transition-colors group-hover:bg-emerald-50 print:px-0.5 print:py-0.5 print:group-hover:bg-transparent dark:border-white/15 dark:group-hover:bg-emerald-500/10">
                                  <ReportTaskCell detail={detailsByTaskId[task.taskId]} />
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-40">
                      <ContextMenuItem onSelect={() => void openEditDialog(record.id)}>
                        Edit TNA
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/80 px-6 text-center text-sm text-slate-500 print:hidden dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
              No TNA records are available for this report.
            </div>
          )}
        </div>
      </ScrollArea>

      <TnaFormDialog
        open={editorOpen}
        mode="edit"
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        initialBuyer={initialBuyer}
        initialJob={initialJob}
        initialValues={editorValues}
        taskOptions={taskOptions}
        taskOptionsLoading={taskOptionsLoading}
        currentTnaId={editingId}
        loadBuyerOptions={loadBuyerOptions}
        loadJobOptions={loadJobOptions}
        loadImportTnaOptions={loadImportTnaOptions}
        loadImportTnaRecord={loadImportTnaRecord}
        loadDetailRevisions={loadDetailRevisions}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditorValues(DEFAULT_FORM_VALUES)
            setInitialBuyer(null)
            setInitialJob(null)
            setEditingId(null)
            setEditorError("")
          }
        }}
        onSubmit={submitEditor}
      />
    </div>
  )
}
