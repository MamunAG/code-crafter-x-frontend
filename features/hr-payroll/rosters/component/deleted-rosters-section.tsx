"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { RosterRecord } from "../../operations/operations.types"

export function DeletedRostersSection() {
  const columns = useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        render: (item: RosterRecord) => <span>{item.employeeId}</span>,
      },
      {
        id: "period",
        header: "Period",
        render: (item: RosterRecord) => (
          <span>
            {item.effectiveFrom} – {item.effectiveTo || "Open ended"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        render: () => (
          <Badge variant="destructive" className="rounded-full">
            Deleted
          </Badge>
        ),
      },
    ],
    []
  )
  return (
    <HrRecordsSection
      title="Deleted roster assignments"
      description="The roster API is append-only and does not expose list, delete, or restore operations."
      data={[]}
      columns={columns}
      getRowId={(item) => item.id}
      emptyMessage="No deleted roster assignments are available."
    />
  )
}
