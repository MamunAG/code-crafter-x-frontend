import { BuyerWorkspace } from "@/features/merchandising/buyers/buyer-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <BuyerWorkspace apiUrl={apiUrl} />
}
