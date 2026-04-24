import { ModuleLandingPage } from "@/components/module-landing-page"

export default function Page() {
  return (
    <ModuleLandingPage
      eyebrow="IAM"
      title="Identity and access management"
      description="This module will cover users, roles, permissions, and access policies."
      actionHref="/account"
      actionLabel="Go to account"
    />
  )
}
