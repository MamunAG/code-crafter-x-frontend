"use client"

import { useEffect, useState } from "react"

import { MASTER_DATA_CONFIGS } from "../../master-data/master-data.config"
import { loadLookupOptions } from "../../operations/operations.service"
import { HrPageHeader } from "../../shared/hr-page-header"
import { HrWorkspaceLayout } from "../../shared/hr-workspace-layout"
import type { HrOption } from "../../shared/hr.types"
import { ConfigurationDeleteDialog } from "../configuration/configuration-delete-dialog"
import { useLeaveConfigurationCrud } from "../configuration/use-leave-configuration-crud"
import { ActiveLeavePolicySection } from "./component/active-leave-policy-section"
import { DeletedLeavePolicySection } from "./component/deleted-leave-policy-section"
import { LeavePolicyEntryForm } from "./component/leave-policy-entry-form"

const config = MASTER_DATA_CONFIGS.leavePolicy
const empty = {
  code: "",
  name: "",
  nameBn: "",
  isActive: true,
  settings: {
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    status: "DRAFT",
    rules: [],
  },
}

export function LeavePolicyWorkspace({ apiUrl }: { apiUrl: string }) {
  const crud = useLeaveConfigurationCrud({ apiUrl, config, emptyValues: empty })
  const [leaveTypes, setLeaveTypes] = useState<HrOption[]>([])

  useEffect(() => {
    if (!crud.organizationId) return

    const pending = window.setTimeout(() => {
      void loadLookupOptions(
        {
          apiUrl,
          organizationId: crud.organizationId,
          accessToken: localStorage.getItem("access_token") ?? "",
        },
        ["leaveTypes"],
      )
        .then((result) =>
          setLeaveTypes(
            result.leaveTypes.map((item) => ({
              value: item.id,
              label: `${item.code ?? ""} · ${item.name ?? item.id}`,
            })),
          ),
        )
        .catch(() => setLeaveTypes([]))
    }, 0)

    return () => window.clearTimeout(pending)
  }, [apiUrl, crud.organizationId])

  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        eyebrow="HR & Payroll · Leave · Configuration"
        title="Leave Policies"
        description="Manage effective-dated entitlement, accrual, eligibility, notice, and documentation rules."
        badges={[
          {
            label: `${crud.activeMeta?.total ?? crud.active.length} current`,
            variant: "secondary",
          },
          { label: `${crud.deletedMeta?.total ?? crud.deleted.length} deleted` },
        ]}
        onRefresh={crud.triggerRefresh}
        onCreate={crud.openCreate}
        createLabel="New policy"
      />
      <ActiveLeavePolicySection
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
        onEdit={(record) => void crud.openEdit(record)}
        onDelete={(record) => crud.setConfirm({ action: "delete", record })}
      />
      <DeletedLeavePolicySection
        data={crud.deleted}
        meta={crud.deletedMeta}
        loading={crud.loading}
        page={crud.deletedPage}
        onPage={crud.setDeletedPage}
        onRestore={(record) => crud.setConfirm({ action: "restore", record })}
      />
      <LeavePolicyEntryForm
        open={crud.dialogOpen}
        mode={crud.mode}
        values={crud.values}
        leaveTypes={leaveTypes}
        submitting={crud.submitting}
        error={crud.error}
        onOpenChange={crud.setDialogOpen}
        onChange={crud.setValues}
        onSubmit={() => void crud.submit()}
      />
      <ConfigurationDeleteDialog
        singular="leave policy"
        confirm={crud.confirm}
        submitting={crud.submitting}
        onClose={() => crud.setConfirm(null)}
        onConfirm={() => void crud.act()}
      />
    </HrWorkspaceLayout>
  )
}
