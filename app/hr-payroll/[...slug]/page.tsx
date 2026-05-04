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
  const pathLabel = slug.length ? `/hr-payroll/${slug.join("/")}` : "/hr-payroll"

  return (
    <ModuleRoutePage
      current="hr-payroll"
      eyebrow="Hr-Payroll"
      title={titleizeSlug(slug)}
      description="This nested HR payroll route is ready for core master data and workforce screens."
      pathLabel={pathLabel}
      showModuleNavigation={false}
    />
  )
}
