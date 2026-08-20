"use client"
import { MASTER_DATA_CONFIGS } from "../../master-data/master-data.config"
import { HrPageHeader } from "../../shared/hr-page-header"
import { HrWorkspaceLayout } from "../../shared/hr-workspace-layout"
import { ConfigurationDeleteDialog } from "../configuration/configuration-delete-dialog"
import { useLeaveConfigurationCrud } from "../configuration/use-leave-configuration-crud"
import { ActiveApprovalWorkflowSection } from "./component/active-approval-workflow-section"
import { DeletedApprovalWorkflowSection } from "./component/deleted-approval-workflow-section"
import { ApprovalWorkflowEntryForm } from "./component/approval-workflow-entry-form"
const config = MASTER_DATA_CONFIGS.leaveWorkflow
const empty = {
  code: "",
  name: "",
  nameBn: "",
  isActive: true,
  settings: {
    active: true,
    levels: [
      {
        levelNumber: 1,
        name: "Reporting Manager",
        approverType: "REPORTING_MANAGER",
        minimumApprovals: 1,
        mandatory: true,
        allowSelfApproval: false,
        canReject: true,
        canReturn: true,
        notifications: true,
      },
    ],
  },
}
export function ApprovalWorkflowWorkspace({ apiUrl }: { apiUrl: string }) {
  const crud = useLeaveConfigurationCrud({ apiUrl, config, emptyValues: empty })
  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        eyebrow="HR & Payroll · Leave · Configuration"
        title="Approval Workflows"
        description="Build ordered, multi-level approval paths with conditional approver sources and actions."
        badges={[
          {
            label: `${crud.activeMeta?.total ?? crud.active.length} current`,
            variant: "secondary",
          },
          {
            label: `${crud.deletedMeta?.total ?? crud.deleted.length} deleted`,
          },
        ]}
        onRefresh={crud.triggerRefresh}
        onCreate={crud.openCreate}
        createLabel="New workflow"
      />
      <ActiveApprovalWorkflowSection
        data={crud.active}
        meta={crud.activeMeta}
        loading={crud.loading}
        page={crud.page}
        limit={crud.limit}
        search={crud.search}
        onSearch={crud.setSearch}
        onPage={crud.setPage}
        onLimit={crud.setLimit}
        onCreate={crud.openCreate}
        onEdit={(r) => void crud.openEdit(r)}
        onDelete={(r) => crud.setConfirm({ action: "delete", record: r })}
      />
      <DeletedApprovalWorkflowSection
        data={crud.deleted}
        meta={crud.deletedMeta}
        loading={crud.loading}
        page={crud.deletedPage}
        onPage={crud.setDeletedPage}
        onRestore={(r) => crud.setConfirm({ action: "restore", record: r })}
      />
      <ApprovalWorkflowEntryForm
        open={crud.dialogOpen}
        mode={crud.mode}
        values={crud.values}
        submitting={crud.submitting}
        error={crud.error}
        onOpenChange={crud.setDialogOpen}
        onChange={crud.setValues}
        onSubmit={() => void crud.submit()}
      />
      <ConfigurationDeleteDialog
        singular="approval workflow"
        confirm={crud.confirm}
        submitting={crud.submitting}
        onClose={() => crud.setConfirm(null)}
        onConfirm={() => void crud.act()}
      />
    </HrWorkspaceLayout>
  )
}
