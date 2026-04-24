import AppContainer from "@/components/app-container"
import { ModuleRoutePage } from "@/components/module-route-page"

export default function Page() {
  return (
    <AppContainer title="Embellishments">
      <ModuleRoutePage
        current="merchandising"
        eyebrow="Merchandising"
        title="Colors"
        description="Dummy colors workspace for palettes, swatches, and other color master data."
        pathLabel="/merchandising/masters/colors"
        showModuleNavigation={false}
        withShell={false}
      />
    </AppContainer>
  )
}
