"use client"

import { useMemo } from "react"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { StatutoryRuleRecord } from "../../operations/operations.types"
export function ActiveStatutoryRulesSection({ data, loading, search, onSearchChange, onApprove }: { data: StatutoryRuleRecord[]; loading: boolean; search: string; onSearchChange: (value: string) => void; onApprove: (record: StatutoryRuleRecord) => void }) {
  const rows = useMemo(() => data.filter((item) => `${item.code} ${item.name} ${item.jurisdiction}`.toLowerCase().includes(search.toLowerCase())), [data, search])
  const columns = useMemo(() => [
    { id: "rule", header: "Rule pack", render: (item: StatutoryRuleRecord) => <div><p className="font-semibold">{item.name}</p><p className="font-mono text-xs text-muted-foreground">{item.code} · v{item.version}</p></div> },
    { id: "jurisdiction", header: "Jurisdiction", render: (item: StatutoryRuleRecord) => <Badge variant="outline" className="rounded-full">{item.jurisdiction}</Badge> },
    { id: "period", header: "Effective period", render: (item: StatutoryRuleRecord) => <span className="text-xs">{item.effectiveFrom} – {item.effectiveTo || "Open ended"}</span> },
    { id: "status", header: "Review", render: (item: StatutoryRuleRecord) => <Badge variant={item.reviewStatus === "APPROVED" ? "secondary" : "outline"} className="rounded-full">{item.reviewStatus}</Badge> },
    { id: "actions", header: "Actions", render: (item: StatutoryRuleRecord) => item.reviewStatus === "APPROVED" ? <span className="text-xs text-muted-foreground">Locked</span> : <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onApprove(item)}><Check />Approve</Button> },
  ], [onApprove])
  return <HrRecordsSection title="Rule packs" data={rows} loading={loading} columns={columns} getRowId={(item) => item.id} search={search} onSearchChange={onSearchChange} emptyMessage="No statutory rule packs match the search." />
}

