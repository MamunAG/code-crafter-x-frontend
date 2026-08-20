import { Suspense } from "react"
import { LeaveWorkspace } from "@/features/hr-payroll/leave/leave-workspace"
export default function Page() { return <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading Leave Management…</div>}><LeaveWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /></Suspense> }

