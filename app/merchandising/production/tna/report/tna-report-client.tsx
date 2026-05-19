"use client"

import dynamic from "next/dynamic"

const TnaReportWorkspace = dynamic(
  () => import("@/features/merchandising/tna/tna-report-workspace").then((module) => module.TnaReportWorkspace),
  { ssr: false },
)

export function TnaReportClient({ apiUrl }: { apiUrl: string }) {
  return <TnaReportWorkspace apiUrl={apiUrl} />
}
