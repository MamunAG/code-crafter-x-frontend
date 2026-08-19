"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"

export type AttendanceActivity = { id: string; operation: string; summary: string; result: unknown; createdAt: string }
export function ActiveAttendanceSection({ data }: { data: AttendanceActivity[] }) {
  const columns = useMemo(() => [
    { id: "operation", header: "Operation", render: (item: AttendanceActivity) => <Badge variant="secondary" className="rounded-full">{item.operation}</Badge> },
    { id: "summary", header: "Summary", render: (item: AttendanceActivity) => <span className="font-medium">{item.summary}</span> },
    { id: "result", header: "API result", render: (item: AttendanceActivity) => <code className="block max-w-lg truncate text-xs text-muted-foreground">{JSON.stringify(item.result)}</code> },
    { id: "time", header: "Completed", render: (item: AttendanceActivity) => <span className="text-xs">{new Date(item.createdAt).toLocaleString()}</span> },
  ], [])
  return <HrRecordsSection title="Recent attendance operations" description="Successful actions performed during this session." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="Attendance actions completed in this session will appear here." />
}

