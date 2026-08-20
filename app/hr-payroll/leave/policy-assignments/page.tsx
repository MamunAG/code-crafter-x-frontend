import { PolicyAssignmentWorkspace } from "@/features/hr-payroll/leave/policy-assignment/policy-assignment-workspace"
export default function Page() { return <PolicyAssignmentWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }
