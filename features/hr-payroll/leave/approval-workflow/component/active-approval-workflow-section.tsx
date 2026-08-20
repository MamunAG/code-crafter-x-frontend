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
export function ActiveApprovalWorkflowSection({
  data,
  meta,
  loading,
  page,
  limit,
  search,
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
  onSearch: (v: string) => void
  onPage: (v: number) => void
  onLimit: (v: number) => void
  onCreate: () => void
  onEdit: (r: MasterDataRecord) => void
  onDelete: (r: MasterDataRecord) => void
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
      header: "Approval levels",
      render: (r) => (
        <span>
          {Array.isArray(r.settings.levels) ? r.settings.levels.length : 0}{" "}
          level(s)
        </span>
      ),
    },
    {
      id: "sequence",
      header: "Sequence",
      render: (r) => (
        <span className="text-muted-foreground">
          {Array.isArray(r.settings.levels)
            ? r.settings.levels
                .map((level) =>
                  String(
                    (level as Record<string, unknown>).name ??
                      (level as Record<string, unknown>).approverType ??
                      "Level"
                  )
                )
                .join(" → ")
            : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      render: (r) => (
        <Badge
          variant={
            r.settings.active !== false && r.isActive ? "secondary" : "outline"
          }
        >
          {r.settings.active !== false && r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
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
      title="Active approval workflows"
      description="Ordered approver levels used by leave applications."
      data={data}
      loading={loading}
      columns={columns}
      getRowId={(r) => r.id}
      search={search}
      onSearchChange={onSearch}
      onCreate={onCreate}
      createLabel="New workflow"
      page={page}
      totalPages={meta?.totalPages ?? 1}
      pageSize={limit}
      onPageChange={onPage}
      onPageSizeChange={(size) => {
        onLimit(size)
        onPage(1)
      }}
      emptyMessage="No active approval workflows found."
    />
  )
}
