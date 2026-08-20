"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ActiveStatutoryRulesSection } from "./component/active-statutory-rules-section"
import { DeletedStatutoryRulesSection } from "./component/deleted-statutory-rules-section"
import { StatutoryRuleFormDialog, type StatutoryRuleFormValues } from "./component/statutory-rule-entry-form"
import { approveStatutoryRule, createStatutoryRule, listStatutoryRules, seedBangladeshRules } from "../operations/operations.service"
import type { StatutoryRuleRecord } from "../operations/operations.types"
import { HrConfirmDialog } from "../shared/hr-confirm-dialog"
import { HrPageHeader } from "../shared/hr-page-header"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DEFAULT_VALUES: StatutoryRuleFormValues = { code: "", name: "", jurisdiction: "BD", effectiveFrom: "", effectiveTo: "", rules: "{}", sourceUrl: "", sourcePublishedAt: "" }
export function StatutoryRulesWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, context, handleError, refreshVersion, triggerRefresh } = useHrWorkspace(apiUrl)
  const [records, setRecords] = useState<StatutoryRuleRecord[]>([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(""); const [open, setOpen] = useState(false); const [values, setValues] = useState<StatutoryRuleFormValues>(DEFAULT_VALUES); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(""); const [target, setTarget] = useState<StatutoryRuleRecord | null>(null)
  const load = useCallback(async () => { if (!organizationId) { setLoading(false); return } setLoading(true); try { setRecords(await listStatutoryRules(context())) } catch (caught) { handleError(caught, "Unable to load statutory rules.") } finally { setLoading(false) } }, [context, handleError, organizationId])
  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load, refreshVersion])
  const submit = async () => { setSubmitting(true); setError(""); try { const rules = JSON.parse(values.rules); await createStatutoryRule(context(), { code: values.code.trim().toUpperCase(), name: values.name.trim(), jurisdiction: values.jurisdiction.trim().toUpperCase(), effectiveFrom: values.effectiveFrom, effectiveTo: values.effectiveTo || undefined, rules, sourceUrl: values.sourceUrl.trim(), sourcePublishedAt: values.sourcePublishedAt || undefined }); toast.success("Statutory rule pack created in draft."); setOpen(false); triggerRefresh() } catch (caught) { setError(caught instanceof SyntaxError ? "Rules must be a valid JSON object." : handleError(caught, "Unable to create the rule pack.", false)) } finally { setSubmitting(false) } }
  const seed = async () => { setSubmitting(true); try { await seedBangladeshRules(context()); toast.success("Bangladesh default rule pack seeded for legal review."); triggerRefresh() } catch (caught) { handleError(caught, "Unable to seed the Bangladesh rules.") } finally { setSubmitting(false) } }
  const approve = async () => { if (!target) return; setSubmitting(true); try { await approveStatutoryRule(context(), target.id); toast.success("Statutory rule pack approved and locked."); setTarget(null); triggerRefresh() } catch (caught) { handleError(caught, "Unable to approve the rule pack.") } finally { setSubmitting(false) } }
  const approved = useMemo(() => records.filter((item) => item.reviewStatus === "APPROVED"), [records]); const drafts = useMemo(() => records.filter((item) => item.reviewStatus !== "APPROVED"), [records])
  return <HrWorkspaceLayout><HrPageHeader title="Statutory Rules" description="Version, source, review, and lock jurisdiction-specific payroll policy packs." badges={[{ label: `${records.length} versions`, variant: "secondary" }, { label: `${approved.length} approved` }, { label: `${drafts.length} awaiting review` }]} onRefresh={triggerRefresh} onCreate={() => { setValues(DEFAULT_VALUES); setError(""); setOpen(true) }} createLabel="New rule pack" actions={<Button variant="outline" className="rounded-xl" disabled={submitting} onClick={seed}>Seed Bangladesh defaults</Button>} /><ActiveStatutoryRulesSection data={records} loading={loading} search={search} onSearchChange={setSearch} onApprove={setTarget} /><DeletedStatutoryRulesSection data={drafts} /><StatutoryRuleFormDialog open={open} values={values} submitting={submitting} error={error} onOpenChange={setOpen} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} onSubmit={submit} /><HrConfirmDialog open={Boolean(target)} title="Approve statutory rule pack" description="Approval locks this version. Confirm that the source and rules have completed legal review." confirmLabel="Approve and lock" working={submitting} onOpenChange={(next) => { if (!next) setTarget(null) }} onConfirm={approve} /></HrWorkspaceLayout>
}
