"use client"

import { AlertTriangle, CalendarDays, Clock3, Landmark, Loader2, ReceiptText, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { PayrollEmployeeRecord, PayrollRunRecord } from "../../operations/operations.types"

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: unknown, currency = "BDT") {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency, maximumFractionDigits: 2 }).format(number(value))
}

function text(snapshot: Record<string, unknown>, key: string, fallback = "—") {
  const value = snapshot[key]
  return typeof value === "string" && value.trim() ? value : fallback
}

function context(record: PayrollEmployeeRecord) {
  const value = record.inputSnapshot.calculationContext
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function PayrollDetailsDialog({ open, run, employees, loading, error, onOpenChange }: { open: boolean; run: PayrollRunRecord | null; employees: PayrollEmployeeRecord[]; loading: boolean; error: string; onOpenChange: (open: boolean) => void }) {
  const totals = run?.totals
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-6xl">
        <div className="border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ReceiptText className="size-5 text-primary" />Salary process details</DialogTitle>
            <DialogDescription>{run ? `${run.periodStart} – ${run.periodEnd} · ${run.processingMode === "INDIVIDUAL" ? "Individual employee" : "Bulk processing"}` : "Employee salary calculation and formula breakdown."}</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="max-h-[calc(100vh-9rem)]">
          <div className="space-y-5 p-6">
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
            {run ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Employees", value: totals?.employees ?? employees.length, icon: Users },
                  { label: "Gross", value: money(totals?.gross, run.currency), icon: Landmark },
                  { label: "Deductions", value: money(totals?.deductions, run.currency), icon: AlertTriangle },
                  { label: "Net payroll", value: money(totals?.net, run.currency), icon: ReceiptText },
                  { label: "Failed", value: totals?.failed ?? employees.filter((item) => item.error).length, icon: AlertTriangle },
                ].map((item) => <div key={item.label} className="rounded-xl border bg-slate-50/70 p-4 dark:bg-white/[0.03]"><div className="flex items-center gap-2 text-xs text-muted-foreground"><item.icon className="size-3.5" />{item.label}</div><p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p></div>)}
              </div>
            ) : null}
            {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading salary details…</div> : null}
            {!loading && !employees.length && !error ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Calculate this draft to create employee salary details.</div> : null}
            {!loading ? employees.map((record) => {
              const employee = record.employeeSnapshot
              const calculation = context(record)
              return (
                <section key={record.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{text(employee, "employeeName")}</h3><Badge variant="outline" className="rounded-md font-mono text-[10px]">{text(employee, "employeeCode")}</Badge>{record.error ? <Badge variant="destructive">Calculation failed</Badge> : null}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{[text(employee, "departmentName", ""), text(employee, "sectionName", ""), text(employee, "designationName", "")].filter(Boolean).join(" · ") || "No organization placement recorded"}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-5 text-right">
                      <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gross</p><p className="font-semibold tabular-nums">{money(record.grossAmount, run?.currency)}</p></div>
                      <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Deduction</p><p className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">{money(record.deductionAmount, run?.currency)}</p></div>
                      <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net pay</p><p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{money(record.netAmount, run?.currency)}</p></div>
                    </div>
                  </div>
                  {record.error ? <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{record.error}</div> : null}
                  <Separator />
                  <div className="grid gap-5 p-5 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance, leave & liability</h4>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: "Payable days", value: number(calculation.PAYABLE_DAYS), icon: CalendarDays },
                          { label: "Unpaid leave", value: number(calculation.UNPAID_LEAVE_DAYS), icon: CalendarDays },
                          { label: "OT hours", value: number(calculation.OVERTIME_HOURS).toFixed(2), icon: Clock3 },
                          { label: "Late minutes", value: number(calculation.LATE_MINUTES), icon: Clock3 },
                          { label: "Loan deduction", value: money(calculation.LOAN_DEDUCTION, run?.currency), icon: Landmark },
                          { label: "Loan outstanding", value: money(calculation.LOAN_OUTSTANDING, run?.currency), icon: Landmark },
                        ].map((item) => <div key={item.label} className="rounded-lg bg-muted/50 p-3"><p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><item.icon className="size-3" />{item.label}</p><p className="mt-1 font-semibold tabular-nums">{item.value}</p></div>)}
                      </div>
                      {record.warnings.length ? <div className="mt-3 flex flex-wrap gap-1">{record.warnings.map((warning) => <Badge key={warning} variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{warning.replaceAll("_", " ")}</Badge>)}</div> : null}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salary components & formulas</h4>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {record.lines.map((line) => <div key={line.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-medium">{line.componentName}</p><p className="font-mono text-[10px] text-muted-foreground">{line.componentCode} · {line.type.replaceAll("_", " ")}</p></div><p className={line.type === "DEDUCTION" ? "font-semibold tabular-nums text-amber-700 dark:text-amber-300" : "font-semibold tabular-nums"}>{money(line.amount, run?.currency)}</p></div><p className="mt-2 truncate rounded bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground" title={line.formula}>{line.formula}</p></div>)}
                        {!record.lines.length ? <p className="text-xs text-muted-foreground">No component lines were created.</p> : null}
                      </div>
                    </div>
                  </div>
                </section>
              )
            }) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
