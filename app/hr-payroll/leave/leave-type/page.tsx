import { LeaveTypeWorkspace } from "@/features/hr-payroll/leave/leave-type/leave-type-workspace"
export default function Page() { return <LeaveTypeWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }
