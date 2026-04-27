import { ConfirmEmailPage } from "@/features/auth/confirm-email/confirm-email-page"

type PageProps = {
  searchParams?: Promise<{
    email?: string | string[]
    from?: string | string[]
    step?: string | string[]
  }>
}

function getSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const initialEmail = getSearchParamValue(resolvedSearchParams?.email)
  const source = getSearchParamValue(resolvedSearchParams?.from)
  const step = getSearchParamValue(resolvedSearchParams?.step)
  const initialStep = source === "register" && step === "code" ? "verify" : undefined

  return <ConfirmEmailPage initialEmail={initialEmail} initialStep={initialStep} />
}
