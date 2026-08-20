import { WorkflowAssignmentWorkspace } from "@/features/hr-payroll/leave/workflow-assignment/workflow-assignment-workspace"
export default function Page() { return <WorkflowAssignmentWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }
