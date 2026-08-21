"use client"

import { Fragment, useMemo } from "react"
import { Eye, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { PayrollRunRecord } from "../../operations/operations.types"
import type { HrPaginationMeta } from "../../shared/hr.types"
import type { PayrollAction } from "./payroll-action-dialog"

function actions(status: string): PayrollAction[] {
  switch (status) {
    case "DRAFT":
    case "FAILED": return ["calculate"]
    case "PREPARED": return ["submit-review"]
    case "UNDER_REVIEW": return ["approve", "reject"]
    case "APPROVED": return ["lock"]
    case "LOCKED": return ["paid", "reverse"]
    default: return []
  }
}

function scopeLabel(item: PayrollRunRecord) {
  const criteria = item.selectionCriteria ?? {}
  if (item.processingMode === "INDIVIDUAL") return "Individual employee"
  if (criteria.includeAllEligible) return "All eligible employees"
  const filters = [criteria.departmentIds?.length ? "Department" : "", criteria.sectionNames?.length ? "Section" : "", criteria.designationIds?.length ? "Designation" : ""].filter(Boolean)
  return filters.join(" + ") || "Bulk scope"
}

export function ActivePayrollSection({ data, meta, loading, search, page, limit, onSearchChange, onPageChange, onLimitChange, onAction, onView }: { data: PayrollRunRecord[]; meta: HrPaginationMeta | null; loading: boolean; search: string; page: number; limit: number; onSearchChange: (value: string) => void; onPageChange: (page: number) => void; onLimitChange: (limit: number) => void; onAction: (record: PayrollRunRecord, action: PayrollAction) => void; onView: (record: PayrollRunRecord) => void }) {
  const columns = useMemo(() => [
    { id: "scope", header: "Payroll scope", render: (item: PayrollRunRecord) => <div><p className="font-semibold">{item.factory?.displayName || item.factory?.name || item.factoryId}</p><p className="text-xs text-muted-foreground">{scopeLabel(item)} · {item.frequency} · {item.runType.replaceAll("_", " ")} · Seq {item.sequence}</p></div> },
    { id: "period", header: "Period", render: (item: PayrollRunRecord) => <div className="text-xs"><p>{item.periodStart} – {item.periodEnd}</p><p className="text-muted-foreground">Pay {item.paymentDate}</p></div> },
    { id: "status", header: "Workflow", render: (item: PayrollRunRecord) => <div className="flex flex-col items-start gap-1"><Badge variant={item.status === "LOCKED" ? "secondary" : item.status === "FAILED" ? "destructive" : "outline"} className="rounded-full">{item.status.replaceAll("_", " ")}</Badge><span className="text-[11px] text-muted-foreground">{item.paidStatus.replaceAll("_", " ")}</span></div> },
    { id: "actions", header: "Actions", render: (item: PayrollRunRecord) => <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Payroll actions"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onSelect={() => onView(item)}><Eye className="size-4" />View salary details</DropdownMenuItem>{actions(item.status).map((action) => <Fragment key={action}><DropdownMenuSeparator /><DropdownMenuItem variant={action === "reject" || action === "reverse" ? "destructive" : "default"} onSelect={() => onAction(item, action)}>{action.replaceAll("-", " ")}</DropdownMenuItem></Fragment>)}</DropdownMenuContent></DropdownMenu> },
  ], [onAction, onView])
  return <HrRecordsSection title="Salary process runs" description="Individual and bulk calculations move through preparation, review, approval, lock, and payment." data={data} loading={loading} columns={columns} getRowId={(item) => item.id} search={search} onSearchChange={onSearchChange} page={page} totalPages={meta?.totalPages ?? 1} pageSize={limit} onPageChange={onPageChange} onPageSizeChange={(size) => { onLimitChange(size); onPageChange(1) }} emptyMessage="No salary process runs found." />
}
