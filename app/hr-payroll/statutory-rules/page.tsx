import { StatutoryRulesWorkspace } from "@/features/hr-payroll/statutory-rules/statutory-rules-workspace"
export default function Page() { return <StatutoryRulesWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

