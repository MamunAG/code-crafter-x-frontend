import { ReportsWorkspace } from "@/features/hr-payroll/reports/reports-workspace"
export default function Page() { return <ReportsWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

