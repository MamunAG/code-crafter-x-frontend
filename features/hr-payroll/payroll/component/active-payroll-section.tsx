"use client"

import { Fragment, useMemo } from "react"
import { MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { PayrollRunRecord } from "../../operations/operations.types"
import type { HrPaginationMeta } from "../../shared/hr.types"
import type { PayrollAction } from "./payroll-action-dialog"

function actions(status: string): PayrollAction[] { switch (status) { case "DRAFT": return ["calculate"]; case "PREPARED": return ["submit-review"]; case "UNDER_REVIEW": return ["approve", "reject"]; case "APPROVED": return ["lock"]; case "LOCKED": return ["paid", "reverse"]; default: return [] } }
export function ActivePayrollSection({ data, meta, loading, search, page, limit, onSearchChange, onPageChange, onLimitChange, onAction }: { data: PayrollRunRecord[]; meta: HrPaginationMeta | null; loading: boolean; search: string; page: number; limit: number; onSearchChange: (value: string) => void; onPageChange: (page: number) => void; onLimitChange: (limit: number) => void; onAction: (record: PayrollRunRecord, action: PayrollAction) => void }) {
  const columns = useMemo(() => [
    { id: "scope", header: "Payroll scope", render: (item: PayrollRunRecord) => <div><p className="font-semibold">{item.factory?.displayName || item.factory?.name || item.factoryId}</p><p className="text-xs text-muted-foreground">{item.frequency} · {item.runType.replaceAll("_", " ")} · Seq {item.sequence}</p></div> },
    { id: "period", header: "Period", render: (item: PayrollRunRecord) => <div className="text-xs"><p>{item.periodStart} – {item.periodEnd}</p><p className="text-muted-foreground">Pay {item.paymentDate}</p></div> },
    { id: "status", header: "Workflow", render: (item: PayrollRunRecord) => <div className="flex flex-col items-start gap-1"><Badge variant={item.status === "LOCKED" ? "secondary" : item.status === "FAILED" ? "destructive" : "outline"} className="rounded-full">{item.status}</Badge><span className="text-[11px] text-muted-foreground">{item.paidStatus}</span></div> },
    { id: "actions", header: "Actions", render: (item: PayrollRunRecord) => <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52">{actions(item.status).length ? actions(item.status).map((action, index) => <Fragment key={action}>{index > 0 ? <DropdownMenuSeparator /> : null}<DropdownMenuItem variant={action === "reject" || action === "reverse" ? "destructive" : "default"} onSelect={() => onAction(item, action)}>{action.replaceAll("-", " ")}</DropdownMenuItem></Fragment>) : <DropdownMenuItem disabled>No actions available</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu> },
  ], [onAction])
  return <HrRecordsSection title="Payroll runs" data={data} loading={loading} columns={columns} getRowId={(item) => item.id} search={search} onSearchChange={onSearchChange} page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} onPageChange={onPageChange} onPageSizeChange={(size) => { onLimitChange(size); onPageChange(1) }} emptyMessage="No payroll runs found." />
}
