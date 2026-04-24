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
  const pathLabel = slug.length ? `/iam/${slug.join("/")}` : "/iam"

  return (
    <ModuleRoutePage
      current="iam"
      eyebrow="IAM"
      title={titleizeSlug(slug)}
      description="This nested IAM route is ready for identity, access control, and security management screens."
      pathLabel={pathLabel}
    />
  )
}
