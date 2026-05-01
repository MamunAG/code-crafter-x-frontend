import { UnitWorkspace } from "@/features/app-config/units/unit-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <UnitWorkspace apiUrl={apiUrl} />
}
