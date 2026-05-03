import { DesignationWorkspace } from "@/features/app-config/designations/designation.workspace"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export default function DesignationSetupPage() {
  return <DesignationWorkspace apiUrl={API_URL} />
}
