import { MaterialGroupWorkspace } from "@/features/app-config/material-groups/material-group-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <MaterialGroupWorkspace apiUrl={apiUrl} />
}
