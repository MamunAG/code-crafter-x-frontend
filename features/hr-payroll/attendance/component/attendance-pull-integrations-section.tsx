"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HrRecordsSection } from "../../shared/hr-records-section"
import type { HrRequestContext } from "../../shared/hr-api"
import {
  deleteAttendancePullIntegration,
  listAttendancePullIntegrations,
  saveAttendancePullIntegration,
  syncAttendancePullIntegration,
  testAttendancePullIntegration,
  type AttendancePullIntegration,
  type AttendancePullTestResult,
} from "../attendance-pull.service"
import {
  AttendancePullIntegrationDialog,
  draftFromIntegration,
  emptyPullDraft,
  pullDraftPayload,
  type AttendancePullDraft,
} from "./attendance-pull-integration-dialog"

export function AttendancePullIntegrationsSection({
  context,
  organizationId,
  handleError,
}: {
  context: () => HrRequestContext
  organizationId: string
  handleError: (error: unknown, fallback: string, notify?: boolean) => string
}) {
  const [records, setRecords] = useState<AttendancePullIntegration[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AttendancePullIntegration | null>(null)
  const [initialDraft, setInitialDraft] =
    useState<AttendancePullDraft>(emptyPullDraft())
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncingId, setSyncingId] = useState("")
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      setRecords(await listAttendancePullIntegrations(context()))
    } catch (caught) {
      handleError(caught, "Unable to load device API integrations.")
    } finally {
      setLoading(false)
    }
  }, [context, handleError, organizationId])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load])
  const create = () => {
    setEditing(null)
    setInitialDraft(emptyPullDraft())
    setError("")
    setDialogOpen(true)
  }
  const edit = (record: AttendancePullIntegration) => {
    setEditing(record)
    setInitialDraft(draftFromIntegration(record))
    setError("")
    setDialogOpen(true)
  }
  const save = async (draft: AttendancePullDraft) => {
    setSaving(true)
    setError("")
    try {
      await saveAttendancePullIntegration(
        context(),
        pullDraftPayload(draft),
        editing?.id
      )
      toast.success(
        `Device API integration ${editing ? "updated" : "created"}.`
      )
      setDialogOpen(false)
      await load()
    } catch (caught) {
      setError(
        handleError(caught, "Unable to save the device API integration.", false)
      )
    } finally {
      setSaving(false)
    }
  }
  const test = async (
    draft: AttendancePullDraft
  ): Promise<AttendancePullTestResult | null> => {
    setTesting(true)
    setError("")
    try {
      const result = await testAttendancePullIntegration(
        context(),
        pullDraftPayload(draft, editing?.id)
      )
      toast.success("Vendor API response loaded.")
      return result
    } catch (caught) {
      setError(handleError(caught, "Unable to test the vendor API.", false))
      return null
    } finally {
      setTesting(false)
    }
  }
  const sync = async (record: AttendancePullIntegration) => {
    setSyncingId(record.id)
    try {
      const result = await syncAttendancePullIntegration(context(), record.id)
      toast.success(`Sync completed: ${JSON.stringify(result)}`)
      await load()
    } catch (caught) {
      handleError(caught, "Unable to synchronize attendance data.")
    } finally {
      setSyncingId("")
    }
  }
  const remove = async (record: AttendancePullIntegration) => {
    if (
      !window.confirm(
        `Delete ${record.name}? This does not delete punches already imported.`
      )
    )
      return
    try {
      await deleteAttendancePullIntegration(context(), record.id)
      toast.success("Device API integration deleted.")
      await load()
    } catch (caught) {
      handleError(caught, "Unable to delete the device API integration.")
    }
  }
  const columns = [
    {
      id: "name",
      header: "Integration",
      render: (record: AttendancePullIntegration) => (
        <div>
          <p className="font-medium">{record.name}</p>
          <code className="text-xs text-muted-foreground">{record.source}</code>
        </div>
      ),
    },
    {
      id: "endpoint",
      header: "Request",
      render: (record: AttendancePullIntegration) => (
        <div className="max-w-72">
          <Badge variant="outline">{record.method}</Badge>
          <p className="mt-1 truncate text-xs" title={record.endpointUrl}>
            {record.endpointUrl}
          </p>
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Schedule",
      render: (record: AttendancePullIntegration) => (
        <span className="text-xs">
          {record.isActive && record.scheduleIntervalMinutes
            ? `Every ${record.scheduleIntervalMinutes} min`
            : "Manual"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Last sync",
      render: (record: AttendancePullIntegration) => (
        <div>
          <Badge
            variant={
              record.lastStatus === "FAILED"
                ? "destructive"
                : record.lastStatus === "SUCCESS"
                  ? "secondary"
                  : "outline"
            }
          >
            {record.lastStatus ?? "Never"}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {record.lastRunAt
              ? new Date(record.lastRunAt).toLocaleString()
              : "Not run"}
          </p>
          {record.lastError ? (
            <p
              className="max-w-64 truncate text-xs text-destructive"
              title={record.lastError}
            >
              {record.lastError}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      render: (record: AttendancePullIntegration) => (
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => void sync(record)}
            disabled={syncingId === record.id}
          >
            {syncingId === record.id ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play />
            )}
            <span className="sr-only">Sync now</span>
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => edit(record)}>
            <Pencil />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void remove(record)}
          >
            <Trash2 />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ]
  return (
    <>
      <HrRecordsSection
        title="External device API integrations"
        description="Pull attendance punches from vendor GET or POST endpoints on a recurring schedule."
        data={records}
        loading={loading}
        columns={columns}
        getRowId={(record) => record.id}
        onRefresh={() => void load()}
        headerActions={
          <Button size="sm" variant="outline" onClick={create}>
            <Plus />
            Add device API
          </Button>
        }
        emptyMessage="No external device APIs configured."
        renderMobileItem={(record) => (
          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{record.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {record.endpointUrl}
                </p>
              </div>
              <Badge variant="outline">{record.method}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>
                {record.isActive && record.scheduleIntervalMinutes
                  ? `Every ${record.scheduleIntervalMinutes} min`
                  : "Manual"}
              </span>
              <span>{record.lastStatus ?? "Never synced"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void sync(record)}
                disabled={syncingId === record.id}
              >
                {syncingId === record.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Play />
                )}
                Sync
              </Button>
              <Button size="sm" variant="outline" onClick={() => edit(record)}>
                <Pencil />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void remove(record)}
              >
                <Trash2 />
                Delete
              </Button>
            </div>
          </div>
        )}
      />
      {dialogOpen ? (
        <AttendancePullIntegrationDialog
          open={dialogOpen}
          integration={editing}
          initialDraft={initialDraft}
          saving={saving}
          testing={testing}
          error={error}
          onOpenChange={setDialogOpen}
          onSave={(draft) => void save(draft)}
          onTest={test}
        />
      ) : null}
    </>
  )
}
