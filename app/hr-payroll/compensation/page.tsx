import { CompensationWorkspace } from "@/features/hr-payroll/compensation/compensation-workspace"
export default function Page() { return <CompensationWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

