"use client"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  HrRecordsSection,
  type HrDisplayColumn,
} from "../../../shared/hr-records-section"
import type {
  MasterDataRecord,
  PaginationMeta,
} from "../../../master-data/master-data.types"
export function DeletedApprovalWorkflowSection({
  data,
  meta,
  loading,
  page,
  onPage,
  onRestore,
}: {
  data: MasterDataRecord[]
  meta: PaginationMeta | null
  loading: boolean
  page: number
  onPage: (v: number) => void
  onRestore: (r: MasterDataRecord) => void
}) {
  const columns: HrDisplayColumn<MasterDataRecord>[] = [
    {
      id: "name",
      header: "Workflow",
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="font-mono text-muted-foreground">{r.code}</p>
        </div>
      ),
    },
    {
      id: "levels",
      header: "Former levels",
      render: (r) => (
        <span>
          {Array.isArray(r.settings.levels) ? r.settings.levels.length : 0}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => onRestore(r)}>
          <RotateCcw />
          Restore
        </Button>
      ),
    },
  ]
  return (
    <HrRecordsSection
      title="Deleted approval workflows"
      description="Workflow snapshots used by existing applications remain unchanged."
      data={data}
      loading={loading}
      columns={columns}
      getRowId={(r) => r.id}
      page={page}
      totalPages={meta?.totalPages ?? 1}
      onPageChange={onPage}
      emptyMessage="No deleted approval workflows."
    />
  )
}
