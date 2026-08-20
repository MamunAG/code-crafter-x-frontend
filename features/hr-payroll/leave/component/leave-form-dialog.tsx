"use client"

import { Loader2, Paperclip } from "lucide-react"
import { AppSelect } from "@/components/app-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LeavePreview } from "../../operations/operations.types"
import type { HrOption } from "../../shared/hr.types"

export type LeaveFormValues = { employeeId: string; leaveTypeId: string; startDate: string; endDate: string; durationType: string; reason: string; contactDuringLeave: string; attachmentUrl: string }
const inputClass = "h-9 rounded-lg"
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>{children}</div> }

export function LeaveFormDialog({ open, values, employees, leaveTypes, durationOptions, preview, previewing, submitting, error, onOpenChange, onChange, onSubmit }: {
  open: boolean; values: LeaveFormValues; employees: HrOption[]; leaveTypes: HrOption[]; durationOptions: HrOption[]; preview: LeavePreview | null; previewing: boolean; submitting: boolean; error: string; onOpenChange: (open: boolean) => void; onChange: <K extends keyof LeaveFormValues>(name: K, value: LeaveFormValues[K]) => void; onSubmit: () => void
}) {
  const rules = preview?.policy
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
    <DialogHeader><DialogTitle>Apply for leave</DialogTitle><DialogDescription>Dates are treated as local business dates. The server calculates the authoritative charge.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Employee" required><AppSelect value={values.employeeId} onValueChange={(value) => onChange("employeeId", value)} options={employees} placeholder="Select employee" triggerClassName={inputClass} /></Field>
      <Field label="Leave type" required><AppSelect value={values.leaveTypeId} onValueChange={(value) => onChange("leaveTypeId", value)} options={leaveTypes} placeholder="Select leave type" triggerClassName={inputClass} /></Field>
      <Field label="From date" required><Input type="date" className={inputClass} value={values.startDate} onChange={(event) => onChange("startDate", event.target.value)} /></Field>
      <Field label="To date" required><Input type="date" min={values.startDate} className={inputClass} value={values.endDate} onChange={(event) => onChange("endDate", event.target.value)} /></Field>
      <Field label="Duration" required><AppSelect value={values.durationType} onValueChange={(value) => onChange("durationType", value)} options={durationOptions} triggerClassName={inputClass} /></Field>
      <Field label="Contact during leave"><Input className={inputClass} value={values.contactDuringLeave} maxLength={255} onChange={(event) => onChange("contactDuringLeave", event.target.value)} placeholder="Phone or email (optional)" /></Field>
      <div className="sm:col-span-2"><Field label="Reason"><Textarea value={values.reason} maxLength={2000} onChange={(event) => onChange("reason", event.target.value)} placeholder="Explain the leave request" /></Field></div>
      <div className="sm:col-span-2"><Field label="Attachment URL"><div className="relative"><Paperclip className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input type="url" className={`${inputClass} pl-9`} value={values.attachmentUrl} onChange={(event) => onChange("attachmentUrl", event.target.value)} placeholder="https://… (when policy requires a document)" /></div></Field></div>
    </div>
    {previewing ? <div className="flex items-center gap-2 rounded-lg border p-4 text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Calculating leave charge…</div> : preview ? <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Current balance", preview.currentBalance], ["Calendar days", preview.calendarDays], ["Weekly offs", preview.weeklyOffDays], ["Holidays", preview.holidays], ["Leave charged", preview.chargeableDays], ["Remaining", preview.balanceAfterApproval]].map(([label, value]) => <div key={String(label)}><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-base font-semibold">{String(value)}</p></div>)}</div>
      {rules ? <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">{Number(rules.maxConsecutiveDays) > 0 ? <span>Maximum {String(rules.maxConsecutiveDays)} consecutive days</span> : null}{Number(rules.noticePeriodDays) > 0 ? <span>• {String(rules.noticePeriodDays)} days notice</span> : null}<span>• Half-day {rules.halfDayAllowed === false ? "not " : ""}allowed</span><span>• Negative balance {rules.allowNegativeBalance ? "allowed" : "not allowed"}</span>{rules.attachmentRequired ? <span>• Attachment required</span> : null}</div> : null}
    </div> : null}
    {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button onClick={onSubmit} disabled={submitting || previewing || !preview}>{submitting ? <Loader2 className="animate-spin"/> : null}Submit application</Button></DialogFooter>
  </DialogContent></Dialog>
}
