import { ConfirmEmailPage } from "@/features/auth/confirm-email/confirm-email-page"

type PageProps = {
  searchParams?: {
    email?: string | string[]
  }
}

export default function Page({ searchParams }: PageProps) {
  const initialEmail = Array.isArray(searchParams?.email)
    ? searchParams.email[0] ?? ""
    : searchParams?.email ?? ""

  return <ConfirmEmailPage initialEmail={initialEmail} />
}
