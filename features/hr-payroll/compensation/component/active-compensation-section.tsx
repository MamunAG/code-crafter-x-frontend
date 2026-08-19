"use client"

import { useMemo } from "react"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { SalaryStructureRecord } from "../../operations/operations.types"

export function ActiveCompensationSection({ data, loading, search, onSearchChange, onActivate }: { data: SalaryStructureRecord[]; loading: boolean; search: string; onSearchChange: (value: string) => void; onActivate: (record: SalaryStructureRecord) => void }) {
  const rows = useMemo(() => data.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search])
  const columns = useMemo(() => [
    { id: "structure", header: "Structure", render: (item: SalaryStructureRecord) => <div><p className="font-semibold">{item.name}</p><p className="font-mono text-xs text-muted-foreground">{item.code} · v{item.version}</p></div> },
    { id: "period", header: "Effective period", render: (item: SalaryStructureRecord) => <span className="text-xs">{item.effectiveFrom} – {item.effectiveTo || "Open ended"}</span> },
    { id: "status", header: "Status", render: (item: SalaryStructureRecord) => <Badge variant={item.isActive ? "secondary" : "outline"} className="rounded-full">{item.isActive ? "Active" : "Draft"}</Badge> },
    { id: "actions", header: "Actions", render: (item: SalaryStructureRecord) => item.isActive ? <span className="text-xs text-muted-foreground">Locked</span> : <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onActivate(item)}><Check />Activate</Button> },
  ], [onActivate])
  return <HrRecordsSection title="Salary structures" data={rows} loading={loading} columns={columns} getRowId={(item) => item.id} search={search} onSearchChange={onSearchChange} emptyMessage="No salary structures match the search." />
}

