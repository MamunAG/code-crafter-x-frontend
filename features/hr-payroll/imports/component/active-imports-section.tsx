"use client"

import { useMemo } from "react"
import { RefreshCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { HrJobRecord } from "../../operations/operations.types"
export function ActiveImportsSection({ data, onRefreshJob }: { data: HrJobRecord[]; onRefreshJob: (job: HrJobRecord) => void }) {
  const columns = useMemo(() => [
    { id: "job", header: "Job", render: (item: HrJobRecord) => <div><code className="text-xs">{item.id}</code><p className="text-xs text-muted-foreground">{String(item.result?.importType ?? item.type)}</p></div> },
    { id: "status", header: "Status", render: (item: HrJobRecord) => <Badge variant={item.status === "COMPLETED" ? "secondary" : "outline"} className="rounded-full">{item.status}</Badge> },
    { id: "progress", header: "Progress", render: (item: HrJobRecord) => <span className="text-xs">{item.progress}% · attempt {item.attempts}/{item.maxAttempts}</span> },
    { id: "result", header: "Result", render: (item: HrJobRecord) => <code className="block max-w-sm truncate text-xs text-muted-foreground">{JSON.stringify(item.result ?? {})}</code> },
    { id: "actions", header: "Actions", render: (item: HrJobRecord) => <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onRefreshJob(item)}><RefreshCcw />Status</Button> },
  ], [onRefreshJob])
  return <HrRecordsSection title="Import jobs" description="Queued and completed imports from this browser session." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="Queued import jobs will appear here." />
}

