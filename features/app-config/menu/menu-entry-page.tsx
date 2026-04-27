import { MenuWorkspace } from "./menu-workspace"

export function MenuEntryPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <MenuWorkspace apiUrl={apiUrl} />
}
