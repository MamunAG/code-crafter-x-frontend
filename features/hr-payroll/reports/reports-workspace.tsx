"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ActiveReportsSection,
  type DisplayReportRow,
} from "./component/active-reports-section"
import {
  DeletedReportsSection,
  type ReportDownload,
} from "./component/deleted-reports-section"
import {
  ReportFormDialog,
  type ReportFormValues,
  type ReportMode,
} from "./component/report-form-dialog"
import {
  downloadPayslips,
  downloadReport,
  getReport,
  loadLookupOptions,
} from "../operations/operations.service"
import { saveBlob } from "../shared/hr-api"
import { HrPageHeader } from "../shared/hr-page-header"
import type { HrOption } from "../shared/hr.types"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DEFAULT_VALUES: ReportFormValues = {
  type: "attendance",
  dateFrom: "",
  dateTo: "",
  factoryId: "__all__",
  employeeId: "__all__",
  format: "json",
  language: "en",
  payrollRunId: "",
}
export function ReportsWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, context, handleError } = useHrWorkspace(apiUrl)
  const [rows, setRows] = useState<DisplayReportRow[]>([])
  const [title, setTitle] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [downloads, setDownloads] = useState<ReportDownload[]>([])
  const [employees, setEmployees] = useState<HrOption[]>([])
  const [factories, setFactories] = useState<HrOption[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ReportMode>("report")
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<ReportFormValues>(DEFAULT_VALUES)
  const [error, setError] = useState("")
  const loadLookups = useCallback(async () => {
    if (!organizationId) return
    try {
      const result = await loadLookupOptions(context(), [
        "employees",
        "factories",
      ])
      setEmployees(
        result.employees.map((item) => ({
          value: item.id,
          label: `${item.employeeCode ?? ""} · ${item.employeeName ?? item.id}`,
        }))
      )
      setFactories(
        result.factories.map((item) => ({
          value: item.id,
          label: `${item.code ?? ""} · ${item.displayName ?? item.name ?? item.id}`,
        }))
      )
    } catch (caught) {
      handleError(caught, "Unable to load report filters.")
    }
  }, [context, handleError, organizationId])
  useEffect(() => {
    const pending = window.setTimeout(() => void loadLookups(), 0)
    return () => window.clearTimeout(pending)
  }, [loadLookups])
  const query = useCallback(
    () => ({
      dateFrom: values.dateFrom || undefined,
      dateTo: values.dateTo || undefined,
      factoryId: values.factoryId === "__all__" ? undefined : values.factoryId,
      employeeId:
        values.employeeId === "__all__" ? undefined : values.employeeId,
      language: values.language,
      page,
      limit: pageSize,
    }),
    [page, pageSize, values]
  )
  const runReport = useCallback(
    async (closeDialog = false) => {
      setLoading(true)
      setError("")
      try {
        const result = await getReport(context(), values.type, query())
        setRows(
          result.items.map((item, index) => ({
            ...item,
            __rowId: `${result.meta.page}-${index}`,
          }))
        )
        setTotalPages(result.meta.totalPages || 1)
        setTitle(`${values.type.replaceAll("-", " ")} report`)
        if (closeDialog) setOpen(false)
      } catch (caught) {
        setError(handleError(caught, "Unable to generate the report.", !open))
      } finally {
        setLoading(false)
      }
    },
    [context, handleError, open, query, values.type]
  )
  // Report filters are intentionally applied only when the user submits the form; pagination reuses that submitted query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pending = window.setTimeout(() => {
      if (title) void runReport(false)
    }, 0)
    return () => window.clearTimeout(pending)
  }, [page, pageSize])
  const submit = async () => {
    setLoading(true)
    setError("")
    try {
      if (mode === "payslips") {
        if (!values.payrollRunId.trim())
          throw new Error("Payroll run ID is required.")
        const blob = await downloadPayslips(
          context(),
          values.payrollRunId.trim(),
          values.language
        )
        saveBlob(blob, `payslips-${values.payrollRunId}.pdf`)
        setDownloads((current) => [
          {
            id: crypto.randomUUID(),
            name: `Payslips ${values.payrollRunId}`,
            format: "pdf",
            createdAt: new Date().toISOString(),
          },
          ...current,
        ])
      } else if (values.format === "json") {
        await runReport(true)
        return
      } else {
        const blob = await downloadReport(context(), values.type, {
          ...query(),
          format: values.format,
        })
        saveBlob(
          blob,
          `hr-${values.type}.${values.format === "xlsx" ? "xlsx" : "pdf"}`
        )
        setDownloads((current) => [
          {
            id: crypto.randomUUID(),
            name: values.type.replaceAll("-", " "),
            format: values.format,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ])
      }
      toast.success("Report downloaded successfully.")
      setOpen(false)
    } catch (caught) {
      setError(handleError(caught, "Unable to generate the report.", false))
    } finally {
      setLoading(false)
    }
  }
  const openMode = (next: ReportMode) => {
    setMode(next)
    setValues(DEFAULT_VALUES)
    setError("")
    setOpen(true)
  }
  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        title="HR Reports"
        description="Preview operational reports, export Excel or PDF files, and generate locked-run payslips."
        badges={[
          { label: `${rows.length} preview rows`, variant: "secondary" },
          { label: `${downloads.length} downloads this session` },
        ]}
        onCreate={() => openMode("report")}
        createLabel="Generate report"
        actions={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => openMode("payslips")}
          >
            Bulk payslips
          </Button>
        }
      />
      <ActiveReportsSection
        title={title}
        data={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
      <DeletedReportsSection data={downloads} />
      <ReportFormDialog
        open={open}
        mode={mode}
        values={values}
        employees={employees}
        factories={factories}
        submitting={loading}
        error={error}
        onOpenChange={setOpen}
        onChange={(name, value) =>
          setValues((current) => ({ ...current, [name]: value }))
        }
        onSubmit={submit}
      />
    </HrWorkspaceLayout>
  )
}
