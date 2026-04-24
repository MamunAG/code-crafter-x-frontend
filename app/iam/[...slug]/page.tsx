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
  const pathLabel = `/iam/${params.slug.join("/")}`

  return (
    <ModuleRoutePage
      current="iam"
      eyebrow="IAM"
      title={titleizeSlug(params.slug)}
      description="This nested IAM route is ready for identity, access control, and security management screens."
      pathLabel={pathLabel}
    />
  )
}
