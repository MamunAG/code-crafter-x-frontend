import { FabricProcessWorkspace } from "@/features/merchandising/fabric-processes/fabric-process-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <FabricProcessWorkspace apiUrl={apiUrl} />
}