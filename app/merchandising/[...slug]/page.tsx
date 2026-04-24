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
  const pathLabel = slug.length ? `/merchandising/${slug.join("/")}` : "/merchandising"

  return (
    <ModuleRoutePage
      current="merchandising"
      eyebrow="Merchandising"
      title={titleizeSlug(slug)}
      description="This nested merchandising route is ready for sourcing, master data, and production screens."
      pathLabel={pathLabel}
      showModuleNavigation={false}
      withShell={false}
    />
  )
}
