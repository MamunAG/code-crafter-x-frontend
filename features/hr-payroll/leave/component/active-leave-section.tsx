"use client"

import { useMemo } from "react"
import { MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { LeaveRequestRecord } from "../../operations/operations.types"
import type { HrOption, HrPaginationMeta } from "../../shared/hr.types"

function tone(status: string) { if (status === "APPROVED") return "secondary" as const; if (status === "REJECTED") return "destructive" as const; return "outline" as const }
export function ActiveLeaveSection({ data, meta, loading, page, limit, search, employees, leaveTypes, onSearchChange, onPageChange, onLimitChange, onCreate, onDecision, onCancel }: { data: LeaveRequestRecord[]; meta: HrPaginationMeta | null; loading: boolean; page: number; limit: number; search: string; employees: HrOption[]; leaveTypes: HrOption[]; onSearchChange: (value: string) => void; onPageChange: (page: number) => void; onLimitChange: (size: number) => void; onCreate: () => void; onDecision: (record: LeaveRequestRecord) => void; onCancel: (record: LeaveRequestRecord) => void }) {
  const label = (options: HrOption[], id: string) => options.find((item) => item.value === id)?.label ?? id
  const columns = useMemo(() => [
    { id: "employee", header: "Employee", render: (item: LeaveRequestRecord) => <span className="font-medium">{label(employees, item.employeeId)}</span> },
    { id: "type", header: "Leave type", render: (item: LeaveRequestRecord) => <span className="text-xs">{label(leaveTypes, item.leaveTypeId)}</span> },
    { id: "period", header: "Period", render: (item: LeaveRequestRecord) => <div className="text-xs"><p>{item.startDate} – {item.endDate}</p><p className="text-muted-foreground">{item.days} day(s){item.isHalfDay ? " · Half day" : ""}</p></div> },
    { id: "status", header: "Status", render: (item: LeaveRequestRecord) => <Badge variant={tone(item.status)} className="rounded-full">{item.status}</Badge> },
    { id: "actions", header: "Actions", render: (item: LeaveRequestRecord) => <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={item.status !== "PENDING"} onSelect={() => onDecision(item)}>Approve or reject</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={!['PENDING','APPROVED'].includes(item.status)} onSelect={() => onCancel(item)}>Cancel request</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
  ], [employees, leaveTypes, onCancel, onDecision])
  return <HrRecordsSection title="Leave requests" data={data} loading={loading} columns={columns} getRowId={(item) => item.id} search={search} onSearchChange={onSearchChange} onCreate={onCreate} createLabel="New request" page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} onPageChange={onPageChange} onPageSizeChange={(size) => { onLimitChange(size); onPageChange(1) }} emptyMessage="No active leave requests found." />
}

