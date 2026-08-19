import { LeaveWorkspace } from "@/features/hr-payroll/leave/leave-workspace"
export default function Page() { return <LeaveWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

