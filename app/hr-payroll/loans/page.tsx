import { LoanWorkspace } from "@/features/hr-payroll/loans/loan-workspace"
export default function Page() { return <LoanWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

