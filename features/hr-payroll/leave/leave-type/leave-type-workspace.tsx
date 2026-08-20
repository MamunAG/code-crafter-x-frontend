"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  deleteMasterData,
  getMasterData,
  listMasterData,
  restoreMasterData,
  saveMasterData,
} from "../../master-data/master-data.service"
import { MASTER_DATA_CONFIGS } from "../../master-data/master-data.config"
import type { PaginationMeta } from "../../master-data/master-data.types"
import { HrPageHeader } from "../../shared/hr-page-header"
import { HrWorkspaceLayout } from "../../shared/hr-workspace-layout"
import { useHrWorkspace } from "../../shared/use-hr-workspace"
import { ActiveLeaveTypeSection } from "./component/active-leave-type-section"
import { DeletedLeaveTypeSection } from "./component/deleted-leave-type-section"
import { LeaveTypeEntryForm } from "./component/leave-type-entry-form"
import {
  EMPTY_LEAVE_TYPE,
  type LeaveTypeFormValues,
  type LeaveTypeRecord,
  type LeaveTypeSettings,
} from "./leave-type.types"

const config = MASTER_DATA_CONFIGS.leaveType
function token() {
  const value = window.localStorage.getItem("access_token")
  if (!value) throw new Error("Your session expired. Please sign in again.")
  return value
}
function valuesFrom(record: LeaveTypeRecord): LeaveTypeFormValues {
  return {
    code: record.code,
    name: record.name,
    nameBn: record.nameBn ?? "",
    isActive: record.isActive,
    rowVersion: record.rowVersion,
    settings: {
      ...EMPTY_LEAVE_TYPE.settings,
      ...record.settings,
    } as LeaveTypeSettings,
  }
}

export function LeaveTypeWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, handleError, refreshVersion, triggerRefresh } =
    useHrWorkspace(apiUrl)
  const [active, setActive] = useState<LeaveTypeRecord[]>([])
  const [deleted, setDeleted] = useState<LeaveTypeRecord[]>([])
  const [activeMeta, setActiveMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [deletedPage, setDeletedPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState("")
  const [values, setValues] = useState<LeaveTypeFormValues>(EMPTY_LEAVE_TYPE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [confirm, setConfirm] = useState<{
    action: "delete" | "restore"
    record: LeaveTypeRecord
  } | null>(null)

  const load = useCallback(async () => {
    if (!organizationId) {
      setActive([])
      setDeleted([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const accessToken = token()
      const [activeResult, deletedResult] = await Promise.all([
        listMasterData({
          apiUrl,
          token: accessToken,
          organizationId,
          config,
          page,
          limit,
          search,
          isActive: "",
        }),
        listMasterData({
          apiUrl,
          token: accessToken,
          organizationId,
          config,
          page: deletedPage,
          limit: 5,
          search: "",
          isActive: "",
          deletedOnly: true,
        }),
      ])
      setActive(activeResult.items as LeaveTypeRecord[])
      setActiveMeta(activeResult.meta)
      setDeleted(deletedResult.items as LeaveTypeRecord[])
      setDeletedMeta(deletedResult.meta)
    } catch (caught) {
      handleError(caught, "Unable to load leave types.")
    } finally {
      setLoading(false)
    }
  }, [apiUrl, deletedPage, handleError, limit, organizationId, page, search])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load, refreshVersion])

  function create() {
    setMode("create")
    setEditingId("")
    setValues(EMPTY_LEAVE_TYPE)
    setError("")
    setDialogOpen(true)
  }
  async function edit(record: LeaveTypeRecord) {
    setMode("edit")
    setEditingId(record.id)
    setValues(valuesFrom(record))
    setError("")
    setDialogOpen(true)
    try {
      const latest = (await getMasterData(
        apiUrl,
        token(),
        organizationId,
        config,
        record.id
      )) as LeaveTypeRecord
      setValues(valuesFrom(latest))
    } catch (caught) {
      setError(handleError(caught, "Unable to load leave type.", false))
    }
  }
  async function submit() {
    if (!values.code.trim() || !values.name.trim()) {
      setError("Code and name are required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await saveMasterData(
        apiUrl,
        token(),
        organizationId,
        config,
        values,
        editingId || undefined
      )
      toast.success(
        `Leave type ${editingId ? "updated" : "created"} successfully.`
      )
      setDialogOpen(false)
      triggerRefresh()
    } catch (caught) {
      setError(handleError(caught, "Unable to save leave type.", false))
    } finally {
      setSubmitting(false)
    }
  }
  async function act() {
    if (!confirm) return
    setSubmitting(true)
    try {
      if (confirm.action === "delete")
        await deleteMasterData(
          apiUrl,
          token(),
          organizationId,
          config,
          confirm.record.id
        )
      else
        await restoreMasterData(
          apiUrl,
          token(),
          organizationId,
          config,
          confirm.record.id
        )
      toast.success(
        confirm.action === "delete"
          ? "Leave type moved to deleted records."
          : "Leave type restored."
      )
      setConfirm(null)
      triggerRefresh()
    } catch (caught) {
      handleError(caught, "Unable to update leave type.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        eyebrow="HR & Payroll · Leave · Configuration"
        title="Leave Types"
        description="Maintain paid and unpaid leave categories, duration options, accrual behavior, documentation, and balance rules."
        badges={[
          {
            label: `${activeMeta?.total ?? active.length} current`,
            variant: "secondary",
          },
          { label: `${deletedMeta?.total ?? deleted.length} deleted` },
        ]}
        onRefresh={triggerRefresh}
        onCreate={create}
        createLabel="New leave type"
      />
      <ActiveLeaveTypeSection
        data={active}
        meta={activeMeta}
        loading={loading}
        page={page}
        limit={limit}
        search={search}
        onSearch={setSearch}
        onPage={setPage}
        onLimit={setLimit}
        onCreate={create}
        onEdit={(record) => void edit(record)}
        onDelete={(record) => setConfirm({ action: "delete", record })}
      />
      <DeletedLeaveTypeSection
        data={deleted}
        meta={deletedMeta}
        loading={loading}
        page={deletedPage}
        onPage={setDeletedPage}
        onRestore={(record) => setConfirm({ action: "restore", record })}
      />
      <LeaveTypeEntryForm
        open={dialogOpen}
        mode={mode}
        values={values}
        submitting={submitting}
        error={error}
        onOpenChange={setDialogOpen}
        onChange={setValues}
        onSubmit={() => void submit()}
      />
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "restore"
                ? "Restore leave type?"
                : "Delete leave type?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "restore"
                ? `${confirm.record.name} will become available again.`
                : `${confirm?.record.name ?? "This leave type"} will be soft deleted. Historical leave applications remain intact.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.action === "delete" ? "destructive" : "default"}
              disabled={submitting}
              onClick={() => void act()}
            >
              {confirm?.action === "restore" ? "Restore" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HrWorkspaceLayout>
  )
}
