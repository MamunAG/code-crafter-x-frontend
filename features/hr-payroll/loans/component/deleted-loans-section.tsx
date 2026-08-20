"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { LoanRecord } from "../../operations/operations.types"
export function DeletedLoansSection({ data }: { data: LoanRecord[] }) {
  const columns = useMemo(
    () => [
      {
        id: "number",
        header: "Loan number",
        render: (item: LoanRecord) => (
          <span className="font-semibold">{item.loanNumber}</span>
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
          <span>{item.outstandingAmount ?? item.outstanding ?? "0"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        render: (item: LoanRecord) => (
          <Badge variant="destructive" className="rounded-full">
            {item.status}
          </Badge>
        ),
      },
    ],
    []
  )
  return (
    <HrRecordsSection
      title="Closed loans"
      description="Settled and cancelled loans remain available for audit; the API does not delete loan records."
      data={data}
      columns={columns}
      getRowId={(item) => item.id}
      emptyMessage="No settled or cancelled loans found."
    />
  )
}
