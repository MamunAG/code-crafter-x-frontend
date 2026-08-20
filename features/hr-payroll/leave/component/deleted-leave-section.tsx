"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { LeaveRequestRecord } from "../../operations/operations.types"
import type { HrOption } from "../../shared/hr.types"

export function DeletedLeaveSection({
  data,
  employees,
}: {
  data: LeaveRequestRecord[]
  employees: HrOption[]
}) {
  const columns = useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        render: (item: LeaveRequestRecord) => (
          <span className="font-medium">
            {employees.find((option) => option.value === item.employeeId)
              ?.label ?? item.employeeId}
          </span>
        ),
      },
      {
        id: "period",
        header: "Period",
        render: (item: LeaveRequestRecord) => (
          <span className="text-xs">
            {item.startDate} – {item.endDate}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        render: (item: LeaveRequestRecord) => (
          <span className="text-xs text-muted-foreground">
            {item.reason || "No reason supplied"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        render: () => (
          <Badge variant="destructive" className="rounded-full">
            Cancelled
          </Badge>
        ),
      },
    ],
    [employees]
  )
  return (
    <HrRecordsSection
      title="Cancelled requests"
      description="Cancelled requests are retained as payroll audit history; the API does not delete leave records."
      data={data}
      columns={columns}
      getRowId={(item) => item.id}
      emptyMessage="No cancelled requests on this page."
    />
  )
}
