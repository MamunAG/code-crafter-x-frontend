import { type ReactNode } from "react"

import { HrPayrollWorkspace } from "@/app/hr-payroll/hr-payroll-workspace"
import { ModuleShell } from "@/components/module-shell"

export default function HrPayrollLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ModuleShell
      current="hr-payroll"
      mainClassName="bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_48%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)]"
    >
      <HrPayrollWorkspace>{children}</HrPayrollWorkspace>
    </ModuleShell>
  )
}
