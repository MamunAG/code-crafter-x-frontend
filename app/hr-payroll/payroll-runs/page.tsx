import { PayrollWorkspace } from "@/features/hr-payroll/payroll/payroll-workspace"
export default function Page() { return <PayrollWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

