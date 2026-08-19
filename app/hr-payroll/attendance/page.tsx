import { AttendanceWorkspace } from "@/features/hr-payroll/attendance/attendance-workspace"
export default function Page() { return <AttendanceWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} /> }

