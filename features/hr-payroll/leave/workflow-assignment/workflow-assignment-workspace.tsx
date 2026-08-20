"use client"

import { useEffect, useState } from "react"

import { MASTER_DATA_CONFIGS } from "../../master-data/master-data.config"
import { listMasterData } from "../../master-data/master-data.service"
import { HrPageHeader } from "../../shared/hr-page-header"
import { HrWorkspaceLayout } from "../../shared/hr-workspace-layout"
import type { HrOption } from "../../shared/hr.types"
import { ConfigurationDeleteDialog } from "../configuration/configuration-delete-dialog"
import { useLeaveConfigurationCrud } from "../configuration/use-leave-configuration-crud"
import { ActiveWorkflowAssignmentSection } from "./component/active-workflow-assignment-section"
import { DeletedWorkflowAssignmentSection } from "./component/deleted-workflow-assignment-section"
import { WorkflowAssignmentEntryForm } from "./component/workflow-assignment-entry-form"

const config = MASTER_DATA_CONFIGS.leaveWorkflowAssignment
const workflowConfig = MASTER_DATA_CONFIGS.leaveWorkflow
const empty = {
  code: "",
  name: "",
  nameBn: "",
  isActive: true,
  settings: {
    targetType: "COMPANY",
    targetId: "",
    workflowId: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    priority: 6,
  },
}

export function WorkflowAssignmentWorkspace({ apiUrl }: { apiUrl: string }) {
  const crud = useLeaveConfigurationCrud({ apiUrl, config, emptyValues: empty })
  const [workflows, setWorkflows] = useState<HrOption[]>([])

  useEffect(() => {
    if (!crud.organizationId) return

    const pending = window.setTimeout(() => {
      void listMasterData({
        apiUrl,
        token: localStorage.getItem("access_token") ?? "",
        organizationId: crud.organizationId,
        config: workflowConfig,
        page: 1,
        limit: 100,
        search: "",
        isActive: "true",
      })
        .then((rows) =>
          setWorkflows(
            rows.items.map((item) => ({
              value: item.id,
              label: `${item.code} · ${item.name}`,
            })),
          ),
        )
        .catch(() => setWorkflows([]))
    }, 0)

    return () => window.clearTimeout(pending)
  }, [apiUrl, crud.organizationId])

  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        eyebrow="HR & Payroll · Leave · Configuration"
        title="Workflow Assignments"
        description="Assign approval workflows by company, factory, department, section, designation, or employee."
        badges={[
          {
            label: `${crud.activeMeta?.total ?? crud.active.length} current`,
            variant: "secondary",
          },
          { label: `${crud.deletedMeta?.total ?? crud.deleted.length} deleted` },
        ]}
        onRefresh={crud.triggerRefresh}
        onCreate={crud.openCreate}
        createLabel="New assignment"
      />
      <ActiveWorkflowAssignmentSection
        data={crud.active}
        meta={crud.activeMeta}
        loading={crud.loading}
        page={crud.page}
        limit={crud.limit}
        search={crud.search}
        workflows={workflows}
        onSearch={crud.setSearch}
        onPage={crud.setPage}
        onLimit={crud.setLimit}
        onCreate={crud.openCreate}
        onEdit={(record) => void crud.openEdit(record)}
        onDelete={(record) => crud.setConfirm({ action: "delete", record })}
      />
      <DeletedWorkflowAssignmentSection
        data={crud.deleted}
        meta={crud.deletedMeta}
        loading={crud.loading}
        page={crud.deletedPage}
        onPage={crud.setDeletedPage}
        onRestore={(record) => crud.setConfirm({ action: "restore", record })}
      />
      <WorkflowAssignmentEntryForm
        open={crud.dialogOpen}
        mode={crud.mode}
        values={crud.values}
        workflows={workflows}
        submitting={crud.submitting}
        error={crud.error}
        onOpenChange={crud.setDialogOpen}
        onChange={crud.setValues}
        onSubmit={() => void crud.submit()}
      />
      <ConfigurationDeleteDialog
        singular="workflow assignment"
        confirm={crud.confirm}
        submitting={crud.submitting}
        onClose={() => crud.setConfirm(null)}
        onConfirm={() => void crud.act()}
      />
    </HrWorkspaceLayout>
  )
}
