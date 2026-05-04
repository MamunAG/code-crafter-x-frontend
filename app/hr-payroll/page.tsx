import { ModuleLandingPage } from "@/components/module-landing-page"

export default function Page() {
  return (
    <ModuleLandingPage
      eyebrow="Hr-Payroll"
      title="Human resources and payroll"
      description="This module is ready for employee master data, department setup, designation setup, and payroll workflows."
      actionHref="/hr-payroll/employee"
      actionLabel="Open employee menu"
    />
  )
}
