import { MenuWorkspace } from "@/features/app-config/menu/menu-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <MenuWorkspace apiUrl={apiUrl} />
}
