import { ShiftWorkspace } from "@/features/hr-payroll/shifts/shift-workspace"
export default function Page() { return <ShiftWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

