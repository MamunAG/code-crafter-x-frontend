"use client"

import { RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HrRecordsSection, type HrDisplayColumn } from "../../../shared/hr-records-section"
import type { PaginationMeta } from "../../../master-data/master-data.types"
import type { LeaveTypeRecord } from "../leave-type.types"

export function DeletedLeaveTypeSection({ data, meta, loading, page, onPage, onRestore }: { data: LeaveTypeRecord[]; meta: PaginationMeta | null; loading: boolean; page: number; onPage: (page: number) => void; onRestore: (record: LeaveTypeRecord) => void }) {
  const columns: HrDisplayColumn<LeaveTypeRecord>[] = [
    { id: "code", header: "Code", render: (row) => <span className="font-mono">{row.code}</span> },
    { id: "name", header: "Leave type", render: (row) => <span className="font-medium">{row.name}</span> },
    { id: "history", header: "Retention", render: () => <span className="text-muted-foreground">Historical applications retained</span> },
    { id: "status", header: "Status", render: () => <Badge variant="destructive">Deleted</Badge> },
    { id: "actions", header: "Actions", render: (row) => <Button variant="outline" size="sm" onClick={() => onRestore(row)}><RotateCcw/>Restore</Button> },
  ]
  return <HrRecordsSection title="Deleted leave types" description="Soft-deleted types remain available to historical leave records and can be restored." data={data} loading={loading} columns={columns} getRowId={(row) => row.id} page={page} totalPages={meta?.totalPages ?? 1} onPageChange={onPage} emptyMessage="No deleted leave types." />
}
