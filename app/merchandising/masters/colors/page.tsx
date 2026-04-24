import { ModuleRoutePage } from "@/components/module-route-page"

export default function Page() {
  return (
    <ModuleRoutePage
      current="merchandising"
      eyebrow="Merchandising"
      title="Colors"
      description="Dummy colors workspace for palettes, swatches, and other color master data."
      pathLabel="/merchandising/masters/colors"
      showModuleNavigation={false}
      withShell={false}
    />
  )
}
