"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { HrJobRecord } from "../../operations/operations.types"
export function DeletedImportsSection({ data }: { data: HrJobRecord[] }) {
  const columns = useMemo(() => [{ id: "job", header: "Job ID", render: (item: HrJobRecord) => <code className="text-xs">{item.id}</code> }, { id: "status", header: "Status", render: () => <Badge variant="destructive" className="rounded-full">Failed</Badge> }, { id: "attempts", header: "Attempts", render: (item: HrJobRecord) => <span className="text-xs">{item.attempts}/{item.maxAttempts}</span> }, { id: "error", header: "Error", render: (item: HrJobRecord) => <span className="text-xs text-destructive">{item.error || "Unknown import error"}</span> }], [])
  return <HrRecordsSection title="Failed imports" description="Failed jobs are retained for audit and troubleshooting; imports are not deleted by the API." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="No import jobs have failed." />
}

