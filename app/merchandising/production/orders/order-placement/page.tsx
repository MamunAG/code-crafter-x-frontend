import { OrderPlacementWorkspace } from "@/features/merchandising/order-placement/order-placement-workspace"

export default function OrderPlacementPage() {
  return <OrderPlacementWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} />
}
