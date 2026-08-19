"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { SalaryAssignmentRecord } from "../../operations/operations.types"
import type { HrOption } from "../../shared/hr.types"

export function DeletedCompensationSection({ data, employees }: { data: SalaryAssignmentRecord[]; employees: HrOption[] }) {
  const columns = useMemo(() => [
    { id: "employee", header: "Employee", render: (item: SalaryAssignmentRecord) => <span className="font-medium">{employees.find((option) => option.value === item.employeeId)?.label ?? item.employeeId}</span> },
    { id: "amount", header: "Base amount", render: (item: SalaryAssignmentRecord) => <span>{item.currency} {item.baseAmount}</span> },
    { id: "period", header: "Effective period", render: (item: SalaryAssignmentRecord) => <span className="text-xs">{item.effectiveFrom} – {item.effectiveTo || "Open ended"}</span> },
    { id: "status", header: "Status", render: () => <Badge variant="secondary" className="rounded-full">Assigned</Badge> },
  ], [employees])
  return <HrRecordsSection title="Assignments created in this session" description="Salary assignments are effective-dated history and are not deleted by the API." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="New salary assignments will appear here." />
}

