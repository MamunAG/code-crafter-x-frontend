"use client"

import { useMemo } from "react"
import { HrRecordsSection, type HrDisplayColumn } from "../../shared/hr-records-section"
import type { ReportRow } from "../../operations/operations.types"

export type DisplayReportRow = ReportRow & { __rowId: string }
function display(value: unknown) { if (value === null || value === undefined || value === "") return "—"; return typeof value === "object" ? JSON.stringify(value) : String(value) }
export function ActiveReportsSection({ title, data, loading, page, totalPages, pageSize, onPageChange, onPageSizeChange }: { title: string; data: DisplayReportRow[]; loading: boolean; page: number; totalPages: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }) {
  const columns = useMemo<HrDisplayColumn<DisplayReportRow>[]>(() => { const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row).filter((key) => key !== "__rowId")))).slice(0, 10); return keys.map((key) => ({ id: key, header: key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "), render: (row) => <span className="text-xs">{display(row[key])}</span> })) }, [data])
  return <HrRecordsSection title={title || "Report preview"} description="The preview uses the server-side report pagination." data={data} loading={loading} columns={columns} getRowId={(item) => item.__rowId} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} emptyMessage="Run a report to preview its rows here." />
}

