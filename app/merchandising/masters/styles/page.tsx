import { StyleWorkspace } from "@/features/merchandising/styles/style-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <StyleWorkspace apiUrl={apiUrl} />
}
