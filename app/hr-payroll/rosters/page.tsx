import { RosterWorkspace } from "@/features/hr-payroll/rosters/roster-workspace"
export default function Page() { return <RosterWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

