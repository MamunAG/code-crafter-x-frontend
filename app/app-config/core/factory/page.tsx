import { FactoryWorkspace } from "@/features/app-config/factory/factory.workspace"


export default function Page() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

    return <FactoryWorkspace apiUrl={apiUrl} />
}