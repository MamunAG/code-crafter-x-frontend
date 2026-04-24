import { ModuleRoutePage } from "@/components/module-route-page"

function titleizeSlug(slug: string[] = []) {
  return slug
    .map((segment) =>
      segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .join(" / ")
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const resolvedParams = await params
  const slug = resolvedParams.slug ?? []
  const pathLabel = slug.length ? `/app-config/${slug.join("/")}` : "/app-config"

  return (
    <ModuleRoutePage
      current="app-config"
      eyebrow="App Confi"
      title={titleizeSlug(slug)}
      description="This nested module route is ready to host app configuration screens and settings workflows."
      pathLabel={pathLabel}
    />
  )
}
