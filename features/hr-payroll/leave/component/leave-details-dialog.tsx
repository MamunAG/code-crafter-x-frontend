"use client"

import { ExternalLink, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LeaveRequestRecord } from "../../operations/operations.types"

function text(value: unknown, fallback = "—") { return typeof value === "string" && value ? value : fallback }
export function LeaveDetailsDialog({ open, loading, record, onOpenChange }: { open: boolean; loading: boolean; record: LeaveRequestRecord | null; onOpenChange: (open: boolean) => void }) {
  const employee = record?.employee ?? {}
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
    <DialogHeader><DialogTitle>Leave application {record?.applicationNumber ?? "details"}</DialogTitle><DialogDescription>Application, day calculation, and immutable approval snapshot.</DialogDescription></DialogHeader>
    {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-5 animate-spin"/></div> : record ? <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-muted-foreground">Employee</p><p className="font-medium">{text(employee.employeeName)}</p><p>{text(employee.employeeCode)}</p></div>
        <div><p className="text-muted-foreground">Department</p><p className="font-medium">{text((employee.department as Record<string, unknown> | undefined)?.departmentName)}</p><p>{text((employee.designation as Record<string, unknown> | undefined)?.designationName)}</p></div>
        <div><p className="text-muted-foreground">Leave</p><p className="font-medium">{record.leaveType?.name ?? record.leaveTypeId}</p><p>{record.startDate} – {record.endDate}</p></div>
        <div><p className="text-muted-foreground">Status</p><Badge variant={record.status === "REJECTED" ? "destructive" : "outline"}>{record.status.replaceAll("_", " ")}</Badge><p className="mt-1">{record.days} day(s)</p></div>
      </div>
      <div><h3 className="mb-2 font-semibold">Reason and contact</h3><p className="rounded-lg border p-3 text-muted-foreground">{record.reason || "No reason supplied."}</p>{record.contactDuringLeave ? <p className="mt-2">Contact: {record.contactDuringLeave}</p> : null}{record.attachmentUrl ? <Button asChild variant="link" className="px-0"><a href={record.attachmentUrl} target="_blank" rel="noreferrer">Open attachment <ExternalLink/></a></Button> : null}</div>
      <div><h3 className="mb-2 font-semibold">Calculated day breakdown</h3><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Day type</TableHead><TableHead>Duration</TableHead><TableHead>Charged days</TableHead></TableRow></TableHeader><TableBody>{record.dayBreakdown?.map((day) => <TableRow key={day.date}><TableCell>{day.date}</TableCell><TableCell>{day.dayType.replaceAll("_", " ")}{day.label ? ` · ${day.label}` : ""}</TableCell><TableCell>{day.duration?.replaceAll("_", " ") ?? "—"}</TableCell><TableCell>{day.chargedDays}</TableCell></TableRow>)}</TableBody></Table></div></div>
      <div><h3 className="mb-2 font-semibold">Approval timeline</h3><ol className="space-y-3 border-l pl-5">{record.approvalHistory?.map((entry, index) => <li key={index} className="relative"><span className="absolute -left-[1.52rem] top-1 size-2 rounded-full bg-primary"/><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{text(entry.decision, `Level ${index + 1}`)}</span>{entry.level ? <Badge variant="outline">Level {String(entry.level)}</Badge> : null}</div><p className="text-muted-foreground">{text(entry.actorName ?? entry.actorId)} · {entry.at ? new Date(String(entry.at)).toLocaleString() : "Waiting"}</p>{entry.comment ? <p className="mt-1 italic">“{String(entry.comment)}”</p> : null}</li>)}</ol></div>
    </div> : <p className="py-12 text-center text-muted-foreground">Unable to load this application.</p>}
    <DialogFooter showCloseButton />
  </DialogContent></Dialog>
}
