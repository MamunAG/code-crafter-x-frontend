import { ApprovalWorkflowWorkspace } from "@/features/hr-payroll/leave/approval-workflow/approval-workflow-workspace"
export default function Page() { return <ApprovalWorkflowWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }
