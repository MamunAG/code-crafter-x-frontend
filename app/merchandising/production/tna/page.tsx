import { ModuleRoutePage } from "@/components/module-route-page"

export default function Page() {
  return (
    <ModuleRoutePage
      current="merchandising"
      eyebrow="Merchandising / Production"
      title="TNA"
      description="Manage TNA tasks from this production entry point."
      pathLabel="/merchandising/production/tna"
      showModuleNavigation={false}
    />
  )
}
