"use client"

import { Loader2 } from "lucide-react"
import { AppSelect } from "@/components/app-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { LeaveTypeFormValues, LeaveTypeSettings } from "../leave-type.types"

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div> }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-xl border p-3"><div><p className="font-medium">{label}</p><p className="text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChange}/></div> }

export function LeaveTypeEntryForm({ open, mode, values, submitting, error, onOpenChange, onChange, onSubmit }: { open: boolean; mode: "create" | "edit"; values: LeaveTypeFormValues; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: (values: LeaveTypeFormValues) => void; onSubmit: () => void }) {
  const setting = <K extends keyof LeaveTypeSettings>(key: K, value: LeaveTypeSettings[K]) => onChange({ ...values, settings: { ...values.settings, [key]: value } })
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="overflow-hidden p-0 sm:max-w-4xl"><div className="flex max-h-[calc(100vh-2rem)] flex-col"><DialogHeader className="border-b px-6 py-5"><DialogTitle>{mode === "create" ? "Create leave type" : "Edit leave type"}</DialogTitle><DialogDescription>Configure entitlement behavior and employee application options. Existing history is retained when a type is deactivated.</DialogDescription></DialogHeader><ScrollArea className="min-h-0 flex-1"><div className="grid gap-4 p-6 sm:grid-cols-2">
    <Field label="Code *"><Input value={values.code} disabled={mode === "edit" || submitting} maxLength={80} onChange={(event) => onChange({ ...values, code: event.target.value.toUpperCase() })} placeholder="ANNUAL" /></Field>
    <Field label="Name *"><Input value={values.name} disabled={submitting} maxLength={255} onChange={(event) => onChange({ ...values, name: event.target.value })} placeholder="Annual Leave" /></Field>
    <Field label="Bangla name"><Input value={values.nameBn} disabled={submitting} onChange={(event) => onChange({ ...values, nameBn: event.target.value })} /></Field>
    <Field label="Color"><Input type="color" value={values.settings.color || "#2563eb"} disabled={submitting} onChange={(event) => setting("color", event.target.value)} /></Field>
    <Field label="Description" className="sm:col-span-2"><Textarea value={values.settings.description} disabled={submitting} onChange={(event) => setting("description", event.target.value)} /></Field>
    <Field label="Classification"><AppSelect value={values.settings.leaveClassification} onValueChange={(value) => setting("leaveClassification", value as LeaveTypeSettings["leaveClassification"])} options={[{ value: "PAID", label: "Paid" }, { value: "UNPAID", label: "Unpaid" }]} triggerClassName="h-9" /></Field>
    <Field label="Unit"><AppSelect value={values.settings.dayUnit} onValueChange={(value) => setting("dayUnit", value as LeaveTypeSettings["dayUnit"])} options={[{ value: "DAY", label: "Day" }, { value: "HOUR", label: "Hour" }]} triggerClassName="h-9" /></Field>
    <Field label="Approval levels"><Input type="number" min={1} max={3} value={values.settings.approvalLevels} onChange={(event) => setting("approvalLevels", Number(event.target.value))} /></Field>
    <Field label="Sort order"><Input type="number" min={0} max={9999} value={values.settings.sortOrder} onChange={(event) => setting("sortOrder", Number(event.target.value))} /></Field>
    <Field label="Accrual frequency"><AppSelect value={values.settings.accrualFrequency} onValueChange={(value) => setting("accrualFrequency", value as LeaveTypeSettings["accrualFrequency"])} options={["NONE", "MONTHLY", "QUARTERLY", "YEARLY"].map((value) => ({ value, label: value }))} triggerClassName="h-9" /></Field>
    <Field label="Accrual rate"><Input type="number" min={0} step="0.01" value={values.settings.accrualRate} onChange={(event) => setting("accrualRate", Number(event.target.value))} /></Field>
    <Field label="Maximum consecutive days"><Input type="number" min={0} step="0.5" value={values.settings.maxConsecutiveDays} onChange={(event) => setting("maxConsecutiveDays", Number(event.target.value))} /></Field>
    <Field label="Advance notice days"><Input type="number" min={0} max={730} value={values.settings.noticePeriodDays} onChange={(event) => setting("noticePeriodDays", Number(event.target.value))} /></Field>
    <Field label="Document required after days"><Input type="number" min={0} step="0.5" value={values.settings.documentationRequiredAfterDays} onChange={(event) => setting("documentationRequiredAfterDays", Number(event.target.value))} /></Field>
    <Field label="Carry-forward cap"><Input type="number" min={0} step="0.5" value={values.settings.carryForwardCap} disabled={!values.settings.carryForwardAllowed} onChange={(event) => setting("carryForwardCap", Number(event.target.value))} /></Field>
    <Field label="Expiry months"><Input type="number" min={0} max={120} value={values.settings.expiryMonths} onChange={(event) => setting("expiryMonths", Number(event.target.value))} /></Field>
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><Toggle label="Active" description="Available for new applications." checked={values.isActive} onChange={(checked) => onChange({ ...values, isActive: checked })}/><Toggle label="Count calendar days" description="Charge holidays and weekly offs." checked={values.settings.countCalendarDays} onChange={(checked) => setting("countCalendarDays", checked)}/><Toggle label="Allow half-day" description="Enable first and second half." checked={values.settings.halfDayAllowed} onChange={(checked) => setting("halfDayAllowed", checked)}/><Toggle label="Allow hourly" description="Enable hourly duration." checked={values.settings.hourlyAllowed} onChange={(checked) => setting("hourlyAllowed", checked)}/><Toggle label="Allow negative balance" description="Permit balance below zero." checked={values.settings.allowNegativeBalance} onChange={(checked) => setting("allowNegativeBalance", checked)}/><Toggle label="Attachment required" description="Require a supporting document." checked={values.settings.attachmentRequired} onChange={(checked) => setting("attachmentRequired", checked)}/><Toggle label="Carry forward" description="Carry unused entitlement forward." checked={values.settings.carryForwardAllowed} onChange={(checked) => setting("carryForwardAllowed", checked)}/><Toggle label="Encashable" description="Permit leave encashment." checked={values.settings.encashable} onChange={(checked) => setting("encashable", checked)}/></div>
    {error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
  </div></ScrollArea><DialogFooter className="border-t px-6 py-4"><Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={submitting} onClick={onSubmit}>{submitting ? <Loader2 className="animate-spin"/> : null}{mode === "create" ? "Create leave type" : "Save changes"}</Button></DialogFooter></div></DialogContent></Dialog>
}
