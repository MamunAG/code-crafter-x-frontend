"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HrRecordsSection, type HrDisplayColumn } from "../../../shared/hr-records-section"
import type { PaginationMeta } from "../../../master-data/master-data.types"
import type { LeaveTypeRecord } from "../leave-type.types"

export function ActiveLeaveTypeSection({ data, meta, loading, page, limit, search, onSearch, onPage, onLimit, onCreate, onEdit, onDelete }: { data: LeaveTypeRecord[]; meta: PaginationMeta | null; loading: boolean; page: number; limit: number; search: string; onSearch: (value: string) => void; onPage: (page: number) => void; onLimit: (limit: number) => void; onCreate: () => void; onEdit: (record: LeaveTypeRecord) => void; onDelete: (record: LeaveTypeRecord) => void }) {
  const columns: HrDisplayColumn<LeaveTypeRecord>[] = [
    { id: "code", header: "Code", render: (row) => <span className="font-mono font-medium">{row.code}</span> },
    { id: "name", header: "Leave type", render: (row) => <div className="flex items-center gap-2"><span className="size-3 rounded-full border" style={{ backgroundColor: row.settings.color || "transparent" }}/><div><p className="font-medium">{row.name}</p><p className="text-muted-foreground">{row.settings.description || row.nameBn || "No description"}</p></div></div> },
    { id: "classification", header: "Classification", render: (row) => <Badge variant="outline">{row.settings.leaveClassification ?? "PAID"}</Badge> },
    { id: "unit", header: "Duration", render: (row) => <div><p>{row.settings.dayUnit ?? "DAY"}</p><p className="text-muted-foreground">{row.settings.halfDayAllowed ? "Half-day" : "Full-day only"}{row.settings.hourlyAllowed ? " · Hourly" : ""}</p></div> },
    { id: "policy", header: "Rules", render: (row) => <div className="text-muted-foreground"><p>Max: {Number(row.settings.maxConsecutiveDays ?? 0) || "No limit"}</p><p>Notice: {Number(row.settings.noticePeriodDays ?? 0)} day(s)</p></div> },
    { id: "status", header: "Status", render: (row) => <Badge variant={row.isActive ? "secondary" : "outline"}>{row.isActive ? "Active" : "Inactive"}</Badge> },
    { id: "actions", header: "Actions", render: (row) => <div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}><Pencil/></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${row.name}`} onClick={() => onDelete(row)}><Trash2/></Button></div> },
  ]
  return <HrRecordsSection title="Active leave types" description="Leave categories available to policy configuration and employee applications." data={data} loading={loading} columns={columns} getRowId={(row) => row.id} search={search} onSearchChange={onSearch} onCreate={onCreate} createLabel="New leave type" page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} onPageChange={onPage} onPageSizeChange={(size) => { onLimit(size); onPage(1) }} emptyMessage="No active leave types found." />
}
