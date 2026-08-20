import { LeavePolicyWorkspace } from "@/features/hr-payroll/leave/leave-policy/leave-policy-workspace"
export default function Page() { return <LeavePolicyWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }
