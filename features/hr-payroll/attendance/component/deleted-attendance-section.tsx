"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { HrRecordsSection } from "../../shared/hr-records-section"

export type RevokedCredential = { id: string; createdAt: string }
export function DeletedAttendanceSection({ data }: { data: RevokedCredential[] }) {
  const columns = useMemo(() => [{ id: "credential", header: "Credential ID", render: (item: RevokedCredential) => <code className="text-xs">{item.id}</code> }, { id: "status", header: "Status", render: () => <Badge variant="destructive" className="rounded-full">Revoked</Badge> }, { id: "time", header: "Revoked", render: (item: RevokedCredential) => <span className="text-xs">{new Date(item.createdAt).toLocaleString()}</span> }], [])
  return <HrRecordsSection title="Revoked credentials" description="Credentials revoked during this session. Revocation is permanent." data={data} columns={columns} getRowId={(item) => item.id} emptyMessage="No credentials have been revoked in this session." />
}

