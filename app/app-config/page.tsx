import { ModuleLandingPage } from "@/components/module-landing-page"

export default function Page() {
  return (
    <ModuleLandingPage
      eyebrow="App Confi"
      title="Application configuration"
      description="This module area is ready for app-level settings, brand options, and global preferences."
      actionHref="/account"
      actionLabel="Go to account"
    />
  )
}
