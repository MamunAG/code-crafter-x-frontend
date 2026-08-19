"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { PayrollRunRecord } from "../../operations/operations.types"
export function DeletedPayrollSection({ data }: { data: PayrollRunRecord[] }) {
  const columns = useMemo(() => [{ id: "scope", header: "Run", render: (item: PayrollRunRecord) => <span className="font-medium">{item.periodStart} – {item.periodEnd}</span> }, { id: "type", header: "Type", render: (item: PayrollRunRecord) => <span className="text-xs">{item.runType.replaceAll("_", " ")}</span> }, { id: "payment", header: "Payment date", render: (item: PayrollRunRecord) => <span className="text-xs">{item.paymentDate}</span> }, { id: "status", header: "Status", render: () => <Badge variant="destructive" className="rounded-full">Reversed</Badge> }], [])
  return <HrRecordsSection title="Reversed payroll" description="Reversed runs are retained permanently for financial audit; payroll records are never deleted." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="No reversed payroll runs on this page." />
}

