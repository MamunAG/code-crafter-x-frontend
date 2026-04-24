import { ModuleRoutePage } from "@/components/module-route-page"

function titleizeSlug(slug: string[]) {
  return slug
    .map((segment) =>
      segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .join(" / ")
}

export default function Page({
  params,
}: {
  params: { slug: string[] }
}) {
  const pathLabel = `/app-config/${params.slug.join("/")}`

  return (
    <ModuleRoutePage
      current="app-config"
      eyebrow="App Confi"
      title={titleizeSlug(params.slug)}
      description="This nested module route is ready to host app configuration screens and settings workflows."
      pathLabel={pathLabel}
    />
  )
}
