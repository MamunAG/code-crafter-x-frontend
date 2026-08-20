"use client"

import { useEffect, useState } from "react"

import { MASTER_DATA_CONFIGS } from "../../master-data/master-data.config"
import { listMasterData } from "../../master-data/master-data.service"
import { loadLookupOptions } from "../../operations/operations.service"
import { HrPageHeader } from "../../shared/hr-page-header"
import { HrWorkspaceLayout } from "../../shared/hr-workspace-layout"
import type { HrOption } from "../../shared/hr.types"
import { ConfigurationDeleteDialog } from "../configuration/configuration-delete-dialog"
import { useLeaveConfigurationCrud } from "../configuration/use-leave-configuration-crud"
import { ActivePolicyAssignmentSection } from "./component/active-policy-assignment-section"
import { DeletedPolicyAssignmentSection } from "./component/deleted-policy-assignment-section"
import { PolicyAssignmentEntryForm } from "./component/policy-assignment-entry-form"

const config = MASTER_DATA_CONFIGS.leavePolicyAssignment
const policyConfig = MASTER_DATA_CONFIGS.leavePolicy
const empty = {
  code: "",
  name: "",
  nameBn: "",
  isActive: true,
  settings: {
    employeeId: "",
    policyId: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    active: true,
  },
}

export function PolicyAssignmentWorkspace({ apiUrl }: { apiUrl: string }) {
  const crud = useLeaveConfigurationCrud({ apiUrl, config, emptyValues: empty })
  const [employees, setEmployees] = useState<HrOption[]>([])
  const [policies, setPolicies] = useState<HrOption[]>([])

  useEffect(() => {
    if (!crud.organizationId) return

    const pending = window.setTimeout(() => {
      const accessToken = localStorage.getItem("access_token") ?? ""
      void Promise.all([
        loadLookupOptions(
          { apiUrl, organizationId: crud.organizationId, accessToken },
          ["employees"],
        ),
        listMasterData({
          apiUrl,
          token: accessToken,
          organizationId: crud.organizationId,
          config: policyConfig,
          page: 1,
          limit: 100,
          search: "",
          isActive: "true",
        }),
      ])
        .then(([lookups, policyRows]) => {
          setEmployees(
            lookups.employees.map((item) => ({
              value: item.id,
              label: `${item.employeeCode ?? ""} · ${item.employeeName ?? item.id}`,
            })),
          )
          setPolicies(
            policyRows.items.map((item) => ({
              value: item.id,
              label: `${item.code} · ${item.name}`,
            })),
          )
        })
        .catch(() => {
          setEmployees([])
          setPolicies([])
        })
    }, 0)

    return () => window.clearTimeout(pending)
  }, [apiUrl, crud.organizationId])

  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        eyebrow="HR & Payroll · Leave · Configuration"
        title="Policy Assignments"
        description="Assign effective-dated leave policies to employees and retain assignment history."
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
      <ActivePolicyAssignmentSection
        data={crud.active}
        meta={crud.activeMeta}
        loading={crud.loading}
        page={crud.page}
        limit={crud.limit}
        search={crud.search}
        employees={employees}
        policies={policies}
        onSearch={crud.setSearch}
        onPage={crud.setPage}
        onLimit={crud.setLimit}
        onCreate={crud.openCreate}
        onEdit={(record) => void crud.openEdit(record)}
        onDelete={(record) => crud.setConfirm({ action: "delete", record })}
      />
      <DeletedPolicyAssignmentSection
        data={crud.deleted}
        meta={crud.deletedMeta}
        loading={crud.loading}
        page={crud.deletedPage}
        onPage={crud.setDeletedPage}
        onRestore={(record) => crud.setConfirm({ action: "restore", record })}
      />
      <PolicyAssignmentEntryForm
        open={crud.dialogOpen}
        mode={crud.mode}
        values={crud.values}
        employees={employees}
        policies={policies}
        submitting={crud.submitting}
        error={crud.error}
        onOpenChange={crud.setDialogOpen}
        onChange={crud.setValues}
        onSubmit={() => void crud.submit()}
      />
      <ConfigurationDeleteDialog
        singular="policy assignment"
        confirm={crud.confirm}
        submitting={crud.submitting}
        onClose={() => crud.setConfirm(null)}
        onConfirm={() => void crud.act()}
      />
    </HrWorkspaceLayout>
  )
}
