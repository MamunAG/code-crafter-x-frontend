"use client"
import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  HrRecordsSection,
  type HrDisplayColumn,
} from "../../../shared/hr-records-section"
import type {
  MasterDataRecord,
  PaginationMeta,
} from "../../../master-data/master-data.types"
import type { HrOption } from "../../../shared/hr.types"
export function ActiveWorkflowAssignmentSection({
  data,
  meta,
  loading,
  page,
  limit,
  search,
  workflows,
  onSearch,
  onPage,
  onLimit,
  onCreate,
  onEdit,
  onDelete,
}: {
  data: MasterDataRecord[]
  meta: PaginationMeta | null
  loading: boolean
  page: number
  limit: number
  search: string
  workflows: HrOption[]
  onSearch: (v: string) => void
  onPage: (v: number) => void
  onLimit: (v: number) => void
  onCreate: () => void
  onEdit: (r: MasterDataRecord) => void
  onDelete: (r: MasterDataRecord) => void
}) {
  const workflow = (id: unknown) =>
    workflows.find((o) => o.value === String(id))?.label ?? String(id ?? "—")
  const columns: HrDisplayColumn<MasterDataRecord>[] = [
    {
      id: "target",
      header: "Target",
      render: (r) => (
        <div>
          <Badge variant="outline">
            {String(r.settings.targetType ?? "COMPANY")}
          </Badge>
          <p className="mt-1 font-mono text-muted-foreground">
            {String(r.settings.targetId ?? "Company-wide")}
          </p>
        </div>
      ),
    },
    {
      id: "workflow",
      header: "Workflow",
      render: (r) => (
        <span className="font-medium">{workflow(r.settings.workflowId)}</span>
      ),
    },
    {
      id: "effective",
      header: "Effective period",
      render: (r) => (
        <span>
          {String(r.settings.effectiveFrom ?? "—")} –{" "}
          {String(r.settings.effectiveTo ?? "Open ended")}
        </span>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      render: (r) => <span>{String(r.settings.priority ?? "—")}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onEdit(r)}
            aria-label={`Edit ${r.name}`}
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onDelete(r)}
            aria-label={`Delete ${r.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]
  return (
    <HrRecordsSection
      title="Active workflow assignments"
      description="Resolution priority: Employee > Designation > Section > Department > Factory > Company."
      data={data}
      loading={loading}
      columns={columns}
      getRowId={(r) => r.id}
      search={search}
      onSearchChange={onSearch}
      onCreate={onCreate}
      createLabel="New assignment"
      page={page}
      totalPages={meta?.totalPages ?? 1}
      pageSize={limit}
      onPageChange={onPage}
      onPageSizeChange={(size) => {
        onLimit(size)
        onPage(1)
      }}
      emptyMessage="No active workflow assignments found."
    />
  )
}
