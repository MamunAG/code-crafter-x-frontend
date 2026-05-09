import { SupplierWorkspace } from "@/features/app-config/suppliers/supplier-workspace"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return <SupplierWorkspace apiUrl={apiUrl} />
}
