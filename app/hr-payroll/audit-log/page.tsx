import { AuditLogWorkspace } from "@/features/hr-payroll/audit-log/audit-log-workspace"

export default function Page() {
  return (
    <AuditLogWorkspace
      apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}
    />
  )
}
