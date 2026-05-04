import { JobWorkspace } from "@/features/merchandising/jobs/job-workspace"

export default function PurchaseOrderPage() {
  return <JobWorkspace apiUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} />
}
