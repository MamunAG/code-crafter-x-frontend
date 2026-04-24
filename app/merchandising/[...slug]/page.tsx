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
  const pathLabel = `/merchandising/${params.slug.join("/")}`

  return (
    <ModuleRoutePage
      current="merchandising"
      eyebrow="Merchandising"
      title={titleizeSlug(params.slug)}
      description="This nested merchandising route is ready for sourcing, master data, and production screens."
      pathLabel={pathLabel}
    />
  )
}
