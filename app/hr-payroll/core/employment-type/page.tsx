import { MASTER_DATA_CONFIGS, MasterDataWorkspace } from "@/features/hr-payroll/master-data"
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
export default function EmploymentTypePage() { return <MasterDataWorkspace apiUrl={API_URL} config={MASTER_DATA_CONFIGS.employmentType} /> }
