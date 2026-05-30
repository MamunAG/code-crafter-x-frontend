import { GmtCostScopeWorkspace } from "@/features/merchandising/gmt-cost-scopes/gmt-cost-scope-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <GmtCostScopeWorkspace apiUrl={apiUrl} />
}
