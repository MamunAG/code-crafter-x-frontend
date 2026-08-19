"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { StatutoryRuleRecord } from "../../operations/operations.types"
export function DeletedStatutoryRulesSection({ data }: { data: StatutoryRuleRecord[] }) {
  const columns = useMemo(() => [{ id: "code", header: "Code", render: (item: StatutoryRuleRecord) => <span className="font-mono text-xs">{item.code} · v{item.version}</span> }, { id: "name", header: "Name", render: (item: StatutoryRuleRecord) => <span className="font-medium">{item.name}</span> }, { id: "source", header: "Source", render: (item: StatutoryRuleRecord) => <a className="text-xs underline" href={item.sourceUrl} target="_blank" rel="noreferrer">Open legal source</a> }, { id: "status", header: "Review", render: (item: StatutoryRuleRecord) => <Badge variant="outline" className="rounded-full">{item.reviewStatus}</Badge> }], [])
  return <HrRecordsSection title="Draft review queue" description="Draft policies stay in the audit trail. Statutory rule packs cannot be deleted by the API." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="No rule packs are awaiting review." />
}

