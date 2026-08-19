"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { ShiftRecord } from "../../operations/operations.types"

export function DeletedShiftsSection({ data }: { data: ShiftRecord[] }) {
  const columns = useMemo(
    () => [
      {
        id: "shift",
        header: "Shift",
        render: (item: ShiftRecord) => (
          <div>
            <p className="font-semibold">{item.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {item.code}
            </p>
          </div>
        ),
      },
      {
        id: "hours",
        header: "Hours",
        render: (item: ShiftRecord) => (
          <span className="text-xs">
            {item.startTime} – {item.endTime}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        render: () => (
          <Badge variant="outline" className="rounded-full">
            Inactive
          </Badge>
        ),
      },
    ],
    []
  )
  return (
    <HrRecordsSection
      title="Inactive shifts"
      description="The shift API retains configurations and does not expose soft-delete or restore operations."
      data={data.filter((item) => !item.isActive)}
      columns={columns}
      getRowId={(item) => item.id}
      emptyMessage="No inactive shifts found."
    />
  )
}
