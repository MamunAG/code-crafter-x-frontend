"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Pencil, Plus, RefreshCcw, RotateCcw, Search, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { deleteMasterData, downloadTemplate, getMasterData, listMasterData, restoreMasterData, saveMasterData, uploadTemplate } from "./master-data.service"
import type { HolidayRow, MasterDataConfig, MasterDataField, MasterDataFormValues, MasterDataRecord, PaginationMeta } from "./master-data.types"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function defaultValues(config: MasterDataConfig): MasterDataFormValues {
  return { code: "", name: "", nameBn: "", isActive: true, settings: Object.fromEntries(config.fields.map((field) => [field.key, field.defaultValue ?? (field.kind === "boolean" ? false : "")])) }
}

function token() {
  const value = window.localStorage.getItem("access_token")
  if (!value) throw new Error("Your session expired. Please sign in again.")
  return value
}

function isAuthError(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function SettingsField({ field, value, disabled, onChange }: { field: MasterDataField; value: unknown; disabled: boolean; onChange: (value: unknown) => void }) {
  if (field.kind === "boolean") return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50/70 p-4 dark:bg-white/[0.03]">
      <div><p className="text-sm font-medium">{field.label}</p>{field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}</div>
      <Switch checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )

  if (field.kind === "weekday-multi") {
    const selected = Array.isArray(value) ? value.map(Number) : []
    return (
      <div className="space-y-2 sm:col-span-2">
        <label className="text-sm font-medium">{field.label}</label>
        <div className="grid gap-2 sm:grid-cols-4">
          {WEEKDAYS.map((day, index) => <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><input type="checkbox" checked={selected.includes(index)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, index].sort() : selected.filter((item) => item !== index))} />{day}</label>)}
        </div>
      </div>
    )
  }

  if (field.kind === "holidays") {
    const holidays = (Array.isArray(value) ? value : []) as HolidayRow[]
    const update = (index: number, key: keyof HolidayRow, next: string) => onChange(holidays.map((holiday, row) => row === index ? { ...holiday, [key]: next } : holiday))
    return (
      <div className="space-y-3 sm:col-span-2">
        <div className="flex items-center justify-between"><label className="text-sm font-medium">{field.label}</label><Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([...holidays, { date: "", name: "", nameBn: "" }])}><Plus />Add holiday</Button></div>
        {holidays.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">No holiday dates added.</p> : holidays.map((holiday, index) => (
          <div key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[150px_1fr_1fr_auto]">
            <Input type="date" value={holiday.date} disabled={disabled} onChange={(event) => update(index, "date", event.target.value)} />
            <Input placeholder="Holiday name" value={holiday.name} disabled={disabled} onChange={(event) => update(index, "name", event.target.value)} />
            <Input placeholder="Bangla name" value={holiday.nameBn ?? ""} disabled={disabled} onChange={(event) => update(index, "nameBn", event.target.value)} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => onChange(holidays.filter((_, row) => row !== index))}><X /></Button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{field.label}</label>
      {field.kind === "select" ? (
        <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : <Input type={field.kind === "number" ? "number" : "text"} min={field.min} max={field.max} step={field.step} placeholder={field.placeholder} value={value === undefined || value === null ? "" : String(value)} disabled={disabled} onChange={(event) => onChange(field.kind === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} />}
    </div>
  )
}

function FormDialog({ config, open, mode, initial: draft, loading, submitting, error, onOpenChange, onValuesChange, onSubmit }: { config: MasterDataConfig; open: boolean; mode: "create" | "edit"; initial: MasterDataFormValues; loading: boolean; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onValuesChange: (values: MasterDataFormValues) => void; onSubmit: (values: MasterDataFormValues) => void }) {
  const setDraft = (update: (current: MasterDataFormValues) => MasterDataFormValues) => onValuesChange(update(draft))
  const disabled = loading || submitting
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-4xl">
        <form className="flex max-h-[calc(100vh-2rem)] flex-col" onSubmit={(event) => { event.preventDefault(); onSubmit(draft) }}>
          <div className="border-b px-6 py-5"><DialogHeader><DialogTitle>{mode === "create" ? `Create ${config.singular}` : `Edit ${config.singular}`}</DialogTitle><DialogDescription>Enter the master record and its HR/payroll defaults.</DialogDescription></DialogHeader>{error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}</div>
          <ScrollArea className="min-h-0 flex-1"><div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-2"><label className="text-sm font-medium">Code *</label><Input value={draft.code} disabled={disabled || mode === "edit"} placeholder="Unique code" onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">English name *</label><Input value={draft.name} disabled={disabled} placeholder={`Enter ${config.singular} name`} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><label className="text-sm font-medium">Bangla name</label><Input value={draft.nameBn} disabled={disabled} placeholder="Optional Bangla name" onChange={(event) => setDraft((current) => ({ ...current, nameBn: event.target.value }))} /></div>
            {config.fields.map((field) => <SettingsField key={field.key} field={field} value={draft.settings[field.key]} disabled={disabled} onChange={(value) => setDraft((current) => ({ ...current, settings: { ...current.settings, [field.key]: value } }))} />)}
            <div className="flex items-center justify-between rounded-xl border bg-slate-50/70 p-4 sm:col-span-2 dark:bg-white/[0.03]"><div><p className="text-sm font-medium">Active</p><p className="text-xs text-muted-foreground">Active records can be selected in HR and payroll transactions.</p></div><Switch checked={draft.isActive} disabled={disabled} onCheckedChange={(isActive) => setDraft((current) => ({ ...current, isActive }))} /></div>
          </div></ScrollArea>
          <DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={disabled || !draft.code.trim() || !draft.name.trim()}>{submitting ? <Loader2 className="animate-spin" /> : null}{mode === "create" ? "Save record" : "Save changes"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Pagination({ meta, page, onPage }: { meta: PaginationMeta | null; page: number; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null
  return <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>Page {meta.page} of {meta.totalPages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)}>Next</Button></div></div>
}

function RecordsCard({ config, title, records, meta, loading, deleted, page, onPage, onEdit, onDelete, onRestore, onPermanent }: { config: MasterDataConfig; title: string; records: MasterDataRecord[]; meta: PaginationMeta | null; loading: boolean; deleted?: boolean; page: number; onPage: (page: number) => void; onEdit: (id: string) => void; onDelete: (record: MasterDataRecord) => void; onRestore: (record: MasterDataRecord) => void; onPermanent: (record: MasterDataRecord) => void }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{deleted ? "Restore records or remove them permanently." : `Manage active and inactive ${config.singular} records.`}</CardDescription></CardHeader><CardContent className="p-0">
    {loading ? <div className="flex min-h-36 items-center justify-center"><Loader2 className="animate-spin" /></div> : records.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No records found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-slate-50/70 text-xs dark:bg-white/[0.03]"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Bangla name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-b last:border-0"><td className="px-4 py-3 font-mono text-xs">{record.code}</td><td className="px-4 py-3 font-medium">{record.name}</td><td className="px-4 py-3">{record.nameBn || "—"}</td><td className="px-4 py-3"><Badge variant={record.isActive ? "secondary" : "outline"}>{deleted ? "Deleted" : record.isActive ? "Active" : "Inactive"}</Badge></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{deleted ? <><Button size="icon" variant="ghost" title="Restore" onClick={() => onRestore(record)}><RotateCcw /></Button><Button size="icon" variant="ghost" title="Delete permanently" onClick={() => onPermanent(record)}><Trash2 className="text-destructive" /></Button></> : <><Button size="icon" variant="ghost" title="Edit" onClick={() => onEdit(record.id)}><Pencil /></Button><Button size="icon" variant="ghost" title="Delete" onClick={() => onDelete(record)}><Trash2 className="text-destructive" /></Button></>}</div></td></tr>)}</tbody></table></div>}
    <Pagination meta={meta} page={page} onPage={onPage} />
  </CardContent></Card>
}

export function MasterDataWorkspace({ apiUrl, config }: { apiUrl: string; config: MasterDataConfig }) {
  const router = useRouter(); const uploadRef = useRef<HTMLInputElement>(null)
  const [organizationId, setOrganizationId] = useState(() => typeof window === "undefined" ? "" : readSelectedOrganizationId())
  const [records, setRecords] = useState<MasterDataRecord[]>([]); const [deleted, setDeleted] = useState<MasterDataRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null); const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1); const [deletedPage, setDeletedPage] = useState(1); const [search, setSearch] = useState(""); const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true); const [refresh, setRefresh] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false); const [editorMode, setEditorMode] = useState<"create" | "edit">("create"); const [editorValues, setEditorValues] = useState(() => defaultValues(config)); const [editingId, setEditingId] = useState<string | undefined>(); const [editorLoading, setEditorLoading] = useState(false); const [submitting, setSubmitting] = useState(false); const [editorError, setEditorError] = useState("")
  const [confirm, setConfirm] = useState<{ record: MasterDataRecord; action: "delete" | "restore" | "permanent" } | null>(null); const [working, setWorking] = useState(false)

  const authFailure = useCallback((message: string) => { if (!isAuthError(message)) return false; localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); localStorage.removeItem("auth_user"); router.replace("/sign-in"); return true }, [router])
  useEffect(() => { const handler = (event: Event) => setOrganizationId(event instanceof CustomEvent ? event.detail?.organizationId || "" : readSelectedOrganizationId()); window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handler); return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handler) }, [])

  const load = useCallback(async () => {
    if (!organizationId) { setRecords([]); setDeleted([]); setLoading(false); return }
    setLoading(true)
    try { const accessToken = token(); const [activeResult, deletedResult] = await Promise.all([
      listMasterData({ apiUrl, token: accessToken, organizationId, config, page, limit: 10, search, isActive: status }),
      listMasterData({ apiUrl, token: accessToken, organizationId, config, page: deletedPage, limit: 5, search, isActive: "", deletedOnly: true }),
    ]); setRecords(activeResult.items); setMeta(activeResult.meta); setDeleted(deletedResult.items); setDeletedMeta(deletedResult.meta) }
    catch (error) { const message = error instanceof Error ? error.message : `Unable to load ${config.singular} records.`; if (!authFailure(message)) toast.error(message) }
    finally { setLoading(false) }
  }, [apiUrl, authFailure, config, deletedPage, organizationId, page, search, status])
  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load, refresh])

  const openEdit = async (id: string) => { setEditorMode("edit"); setEditingId(id); setEditorOpen(true); setEditorLoading(true); setEditorError(""); try { const record = await getMasterData(apiUrl, token(), organizationId, config, id); setEditorValues({ code: record.code, name: record.name, nameBn: record.nameBn ?? "", settings: record.settings ?? {}, isActive: record.isActive, rowVersion: record.rowVersion }) } catch (error) { const message = error instanceof Error ? error.message : "Unable to load the record."; setEditorError(message); authFailure(message) } finally { setEditorLoading(false) } }
  const submit = async (values: MasterDataFormValues) => { setSubmitting(true); setEditorError(""); try { await saveMasterData(apiUrl, token(), organizationId, config, values, editingId); toast.success(`${config.title.replace(" Setup", "")} ${editingId ? "updated" : "created"} successfully.`); setEditorOpen(false); setRefresh((value) => value + 1) } catch (error) { const message = error instanceof Error ? error.message : "Unable to save the record."; setEditorError(message); authFailure(message) } finally { setSubmitting(false) } }
  const act = async () => { if (!confirm) return; setWorking(true); try { if (confirm.action === "restore") await restoreMasterData(apiUrl, token(), organizationId, config, confirm.record.id); else await deleteMasterData(apiUrl, token(), organizationId, config, confirm.record.id, confirm.action === "permanent"); toast.success(confirm.action === "restore" ? "Record restored successfully." : confirm.action === "permanent" ? "Record deleted permanently." : "Record moved to recently deleted."); setConfirm(null); setRefresh((value) => value + 1) } catch (error) { const message = error instanceof Error ? error.message : "Unable to complete the action."; if (!authFailure(message)) toast.error(message) } finally { setWorking(false) } }
  const download = async () => { try { const blob = await downloadTemplate(apiUrl, token(), organizationId, config); const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = `${config.slug}-upload-template.csv`; anchor.click(); URL.revokeObjectURL(objectUrl) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to download the template.") } }
  const upload = async (file?: File) => { if (!file) return; try { const result = await uploadTemplate(apiUrl, token(), organizationId, config, file); toast.success(`${result.inserted} inserted, ${result.skipped} skipped${result.errors.length ? `, ${result.errors.length} row errors` : ""}.`); setRefresh((value) => value + 1) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to upload the template.") } finally { if (uploadRef.current) uploadRef.current.value = "" } }
  const total = meta?.total ?? records.length; const active = useMemo(() => records.filter((record) => record.isActive).length, [records])

  return <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8"><div className="space-y-6">
    <Card className="bg-white/85 dark:bg-slate-950/75"><CardContent className="p-5 sm:p-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">HR &amp; Payroll · Core</p><h1 className="mt-2 text-3xl font-semibold">{config.title}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{config.description}</p><div className="mt-4 flex gap-2"><Badge variant="secondary">{total} total</Badge><Badge variant="outline">{active} active on page</Badge><Badge variant="outline">{deletedMeta?.total ?? 0} deleted</Badge></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setRefresh((value) => value + 1)}><RefreshCcw />Refresh</Button><Button onClick={() => { setEditorMode("create"); setEditingId(undefined); setEditorValues(defaultValues(config)); setEditorError(""); setEditorOpen(true) }}><Plus />New {config.singular}</Button></div></div></CardContent></Card>
    {!organizationId ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Select an organization to manage {config.singular} records.</CardContent></Card> : <>
      <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={search} placeholder="Search code or name" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div><select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><Button variant="outline" onClick={() => void download()}><Download />Template</Button><Button variant="outline" onClick={() => uploadRef.current?.click()}><Upload />Upload CSV</Button><input ref={uploadRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} /></CardContent></Card>
      <RecordsCard config={config} title={`Current ${config.title.replace(" Setup", "")} records`} records={records} meta={meta} loading={loading} page={page} onPage={setPage} onEdit={(id) => void openEdit(id)} onDelete={(record) => setConfirm({ record, action: "delete" })} onRestore={() => undefined} onPermanent={() => undefined} />
      <RecordsCard config={config} title="Recently deleted" records={deleted} meta={deletedMeta} loading={loading} deleted page={deletedPage} onPage={setDeletedPage} onEdit={() => undefined} onDelete={() => undefined} onRestore={(record) => setConfirm({ record, action: "restore" })} onPermanent={(record) => setConfirm({ record, action: "permanent" })} />
    </>}
  </div>
  <FormDialog config={config} open={editorOpen} mode={editorMode} initial={editorValues} loading={editorLoading} submitting={submitting} error={editorError} onOpenChange={setEditorOpen} onValuesChange={setEditorValues} onSubmit={(values) => void submit(values)} />
  <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm?.action === "restore" ? "Restore record" : confirm?.action === "permanent" ? "Delete permanently" : "Delete record"}</AlertDialogTitle><AlertDialogDescription>{confirm?.action === "permanent" ? "This action cannot be undone." : confirm?.action === "restore" ? "The record will return to the current list." : "The record can be restored from the recently deleted section."} {confirm?.record.name}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant={confirm?.action === "restore" ? "default" : "destructive"} disabled={working} onClick={() => void act()}>{working ? <Loader2 className="animate-spin" /> : null}{confirm?.action === "restore" ? "Restore" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
