"use client"

import { useMemo } from "react"
import { MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { LoanRecord } from "../../operations/operations.types"
import type { HrOption } from "../../shared/hr.types"

export function ActiveLoansSection({
  data,
  loading,
  search,
  employees,
  onSearchChange,
  onStatus,
}: {
  data: LoanRecord[]
  loading: boolean
  search: string
  employees: HrOption[]
  onSearchChange: (value: string) => void
  onStatus: (record: LoanRecord) => void
}) {
  const rows = useMemo(
    () =>
      data.filter((item) =>
        `${item.loanNumber} ${item.employeeId} ${item.status}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [data, search]
  )
  const columns = useMemo(
    () => [
      {
        id: "loan",
        header: "Loan",
        render: (item: LoanRecord) => (
          <div>
            <p className="font-semibold">{item.loanNumber}</p>
            <p className="text-xs text-muted-foreground">
              {employees.find((option) => option.value === item.employeeId)
                ?.label ?? item.employeeId}
            </p>
          </div>
        ),
      },
      {
        id: "principal",
        header: "Principal",
        render: (item: LoanRecord) => <span>{item.principal}</span>,
      },
      {
        id: "outstanding",
        header: "Outstanding",
        render: (item: LoanRecord) => (
          <span>{item.outstandingAmount ?? item.outstanding ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        render: (item: LoanRecord) => (
          <Badge
            variant={item.status === "ACTIVE" ? "secondary" : "outline"}
            className="rounded-full"
          >
            {item.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        render: (item: LoanRecord) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={item.id.startsWith("report-")}
                onSelect={() => onStatus(item)}
              >
                Change status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [employees, onStatus]
  )
  return (
    <HrRecordsSection
      title="Open loans"
      data={rows}
      loading={loading}
      columns={columns}
      getRowId={(item) => item.id}
      search={search}
      onSearchChange={onSearchChange}
      emptyMessage="No open loans found."
    />
  )
}
