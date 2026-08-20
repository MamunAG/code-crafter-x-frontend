"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { deleteMasterData, getMasterData, listMasterData, restoreMasterData, saveMasterData } from "../../master-data/master-data.service"
import type { MasterDataConfig, MasterDataFormValues, MasterDataRecord, PaginationMeta } from "../../master-data/master-data.types"
import { useHrWorkspace } from "../../shared/use-hr-workspace"

function accessToken() { const value = window.localStorage.getItem("access_token"); if (!value) throw new Error("Your session expired. Please sign in again."); return value }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

export function useLeaveConfigurationCrud({ apiUrl, config, emptyValues }: { apiUrl: string; config: MasterDataConfig; emptyValues: MasterDataFormValues }) {
  const { organizationId, handleError, refreshVersion, triggerRefresh } = useHrWorkspace(apiUrl)
  const [active, setActive] = useState<MasterDataRecord[]>([])
  const [deleted, setDeleted] = useState<MasterDataRecord[]>([])
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
  const [values, setValues] = useState<MasterDataFormValues>(() => clone(emptyValues))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [confirm, setConfirm] = useState<{ action: "delete" | "restore"; record: MasterDataRecord } | null>(null)

  const load = useCallback(async () => {
    if (!organizationId) { setActive([]); setDeleted([]); setLoading(false); return }
    setLoading(true)
    try {
      const token = accessToken()
      const [current, removed] = await Promise.all([
        listMasterData({ apiUrl, token, organizationId, config, page, limit, search, isActive: "" }),
        listMasterData({ apiUrl, token, organizationId, config, page: deletedPage, limit: 5, search: "", isActive: "", deletedOnly: true }),
      ])
      setActive(current.items); setActiveMeta(current.meta); setDeleted(removed.items); setDeletedMeta(removed.meta)
    } catch (caught) { handleError(caught, `Unable to load ${config.title.toLowerCase()}.`) } finally { setLoading(false) }
  }, [apiUrl, config, deletedPage, handleError, limit, organizationId, page, search])
  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load, refreshVersion])

  function openCreate() { setMode("create"); setEditingId(""); setValues(clone(emptyValues)); setError(""); setDialogOpen(true) }
  async function openEdit(record: MasterDataRecord) { setMode("edit"); setEditingId(record.id); setValues({ code: record.code, name: record.name, nameBn: record.nameBn ?? "", isActive: record.isActive, rowVersion: record.rowVersion, settings: clone(record.settings) }); setError(""); setDialogOpen(true); try { const latest = await getMasterData(apiUrl, accessToken(), organizationId, config, record.id); setValues({ code: latest.code, name: latest.name, nameBn: latest.nameBn ?? "", isActive: latest.isActive, rowVersion: latest.rowVersion, settings: clone(latest.settings) }) } catch (caught) { setError(handleError(caught, `Unable to load ${config.singular}.`, false)) } }
  async function submit() { if (!values.code.trim() || !values.name.trim()) { setError("Code and name are required."); return } setSubmitting(true); setError(""); try { await saveMasterData(apiUrl, accessToken(), organizationId, config, values, editingId || undefined); toast.success(`${config.singular} ${editingId ? "updated" : "created"} successfully.`); setDialogOpen(false); triggerRefresh() } catch (caught) { setError(handleError(caught, `Unable to save ${config.singular}.`, false)) } finally { setSubmitting(false) } }
  async function act() { if (!confirm) return; setSubmitting(true); try { if (confirm.action === "delete") await deleteMasterData(apiUrl, accessToken(), organizationId, config, confirm.record.id); else await restoreMasterData(apiUrl, accessToken(), organizationId, config, confirm.record.id); toast.success(confirm.action === "delete" ? `${config.singular} moved to deleted records.` : `${config.singular} restored.`); setConfirm(null); triggerRefresh() } catch (caught) { handleError(caught, `Unable to update ${config.singular}.`) } finally { setSubmitting(false) } }

  return { organizationId, active, deleted, activeMeta, deletedMeta, page, setPage, deletedPage, setDeletedPage, limit, setLimit, search, setSearch, loading, dialogOpen, setDialogOpen, mode, values, setValues, submitting, error, confirm, setConfirm, openCreate, openEdit, submit, act, triggerRefresh }
}
