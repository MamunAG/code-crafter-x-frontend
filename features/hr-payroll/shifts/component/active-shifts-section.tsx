"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { ShiftRecord } from "../../operations/operations.types"

export function ActiveShiftsSection({
  data,
  loading,
  search,
  onSearchChange,
  onRefresh,
  onCreate,
}: {
  data: ShiftRecord[]
  loading: boolean
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onCreate: () => void
}) {
  const rows = useMemo(
    () =>
      data.filter((item) =>
        `${item.code} ${item.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [data, search]
  )
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
        id: "break",
        header: "Break",
        render: (item: ShiftRecord) => (
          <span className="text-xs">{item.breakMinutes} min</span>
        ),
      },
      {
        id: "grace",
        header: "Grace",
        render: (item: ShiftRecord) => (
          <span className="text-xs">
            In {item.graceInMinutes} / Out {item.graceOutMinutes} min
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        render: (item: ShiftRecord) => (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={item.isActive ? "secondary" : "outline"}
              className="rounded-full"
            >
              {item.isActive ? "Active" : "Inactive"}
            </Badge>
            {item.isOvernight ? (
              <Badge variant="outline" className="rounded-full">
                Overnight
              </Badge>
            ) : null}
            {item.isFlexible ? (
              <Badge variant="outline" className="rounded-full">
                Flexible
              </Badge>
            ) : null}
          </div>
        ),
      },
    ],
    []
  )
  return (
    <HrRecordsSection
      title="Active shifts"
      data={rows}
      loading={loading}
      columns={columns}
      getRowId={(item) => item.id}
      search={search}
      onSearchChange={onSearchChange}
      onRefresh={onRefresh}
      onCreate={onCreate}
      createLabel="New shift"
      emptyMessage="No shifts match the current search."
    />
  )
}
