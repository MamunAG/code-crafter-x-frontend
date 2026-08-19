import { ImportsWorkspace } from "@/features/hr-payroll/imports/imports-workspace"
export default function Page() { return <ImportsWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

