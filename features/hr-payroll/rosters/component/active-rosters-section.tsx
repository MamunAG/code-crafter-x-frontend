"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { RosterRecord } from "../../operations/operations.types"
import type { HrOption } from "../../shared/hr.types"

export function ActiveRostersSection({
  data,
  employeeOptions,
  shiftOptions,
}: {
  data: RosterRecord[]
  employeeOptions: HrOption[]
  shiftOptions: HrOption[]
}) {
  const label = (options: HrOption[], value: string) =>
    options.find((item) => item.value === value)?.label ?? value
  const columns = useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        render: (item: RosterRecord) => (
          <span className="font-medium">
            {label(employeeOptions, item.employeeId)}
          </span>
        ),
      },
      {
        id: "shift",
        header: "Shift",
        render: (item: RosterRecord) => (
          <Badge variant="secondary" className="rounded-full">
            {label(shiftOptions, item.shiftId)}
          </Badge>
        ),
      },
      {
        id: "period",
        header: "Effective period",
        render: (item: RosterRecord) => (
          <span className="text-xs">
            {item.effectiveFrom} – {item.effectiveTo || "Open ended"}
          </span>
        ),
      },
      {
        id: "off",
        header: "Weekly off",
        render: (item: RosterRecord) => (
          <span className="text-xs">{item.weeklyOffDays.join(", ")}</span>
        ),
      },
    ],
    [employeeOptions, shiftOptions]
  )
  return (
    <HrRecordsSection
      title="Assignments created in this session"
      description="The roster API currently returns newly assigned records but does not expose a roster list endpoint."
      data={data}
      columns={columns}
      getRowId={(item) => item.id}
      emptyMessage="New roster assignments will appear here after they are saved."
    />
  )
}
