import { ModuleRoutePage } from "@/components/module-route-page"

export default function Page() {
  return (
    <ModuleRoutePage
      current="hr-payroll"
      eyebrow="Hr-Payroll"
      title="Core"
      description="Core HR payroll master data lives here, including departments and designations."
      pathLabel="/hr-payroll/core"
      showModuleNavigation={false}
    />
  )
}
