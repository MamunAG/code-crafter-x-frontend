import { ModuleRoutePage } from "@/components/module-route-page"

export default function Page() {
  return (
    <ModuleRoutePage
      current="merchandising"
      eyebrow="Merchandising"
      title="Sizes"
      description="Dummy colors workspace for palettes, swatches, and other color master data."
      pathLabel="/merchandising/masters/sizes"
      showModuleNavigation={false}
    />
  )
}
