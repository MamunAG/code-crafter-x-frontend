import { CountryWorkspace } from "@/features/app-config/countries/country-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <CountryWorkspace apiUrl={apiUrl} />
}
