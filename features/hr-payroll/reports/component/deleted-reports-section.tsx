"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
export type ReportDownload = { id: string; name: string; format: string; createdAt: string }
export function DeletedReportsSection({ data }: { data: ReportDownload[] }) {
  const columns = useMemo(() => [{ id: "report", header: "Report", render: (item: ReportDownload) => <span className="font-medium">{item.name}</span> }, { id: "format", header: "Format", render: (item: ReportDownload) => <Badge variant="outline" className="rounded-full">{item.format.toUpperCase()}</Badge> }, { id: "time", header: "Generated", render: (item: ReportDownload) => <span className="text-xs">{new Date(item.createdAt).toLocaleString()}</span> }], [])
  return <HrRecordsSection title="Generated downloads" description="Download activity for this browser session; reports are generated on demand and are not deleted records." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="Downloaded reports and payslips will be listed here." />
}

