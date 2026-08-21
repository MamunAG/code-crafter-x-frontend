"use client"

import { useMemo, useState } from "react"
import { Loader2, Plus, TestTube2, Trash2 } from "lucide-react"
import { AppSelect } from "@/components/app-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type {
  AttendancePullIntegration,
  AttendancePullMapping,
  AttendancePullPayload,
  AttendancePullTargetField,
  AttendancePullTestResult,
} from "../attendance-pull.service"

export type AttendancePullDraft = {
  name: string
  source: string
  endpointUrl: string
  method: "GET" | "POST"
  headersJson: string
  queryJson: string
  bodyJson: string
  secretLocation: "HEADER" | "QUERY" | "BODY"
  secretKey: string
  secretValue: string
  secretConfigured: boolean
  responseItemsPath: string
  mappings: AttendancePullMapping[]
  directionMapJson: string
  cursorResponsePath: string
  scheduleIntervalMinutes: string
  isActive: boolean
}

const TARGETS: Array<{ value: AttendancePullTargetField; label: string }> = [
  { value: "externalEventId", label: "External event ID" },
  { value: "employeeId", label: "Employee UUID" },
  { value: "employeeCode", label: "Employee code" },
  { value: "punchedAt", label: "Punch date/time" },
  { value: "direction", label: "Direction" },
  { value: "deviceIdentifier", label: "Device identifier" },
  { value: "metadata", label: "Metadata" },
]

export function emptyPullDraft(): AttendancePullDraft {
  return {
    name: "",
    source: "",
    endpointUrl: "",
    method: "GET",
    headersJson: "{}",
    queryJson: "{}",
    bodyJson: "{}",
    secretLocation: "HEADER",
    secretKey: "X-API-Key",
    secretValue: "",
    secretConfigured: false,
    responseItemsPath: "",
    mappings: [],
    directionMapJson: '{"0":"IN","1":"OUT"}',
    cursorResponsePath: "",
    scheduleIntervalMinutes: "5",
    isActive: false,
  }
}

export function draftFromIntegration(
  record: AttendancePullIntegration
): AttendancePullDraft {
  return {
    name: record.name,
    source: record.source,
    endpointUrl: record.endpointUrl,
    method: record.method,
    headersJson: JSON.stringify(record.requestConfig.headers ?? {}, null, 2),
    queryJson: JSON.stringify(record.requestConfig.query ?? {}, null, 2),
    bodyJson: JSON.stringify(record.requestConfig.body ?? {}, null, 2),
    secretLocation: record.requestConfig.secret?.location ?? "HEADER",
    secretKey: record.requestConfig.secret?.key ?? "X-API-Key",
    secretValue: "",
    secretConfigured: Boolean(record.requestConfig.secret?.configured),
    responseItemsPath: record.responseItemsPath ?? "",
    mappings: record.mappings ?? [],
    directionMapJson: JSON.stringify(record.directionMap ?? {}, null, 2),
    cursorResponsePath: record.cursorResponsePath ?? "",
    scheduleIntervalMinutes: record.scheduleIntervalMinutes
      ? String(record.scheduleIntervalMinutes)
      : "",
    isActive: record.isActive,
  }
}

function parseJson(value: string, label: string, objectOnly = false): unknown {
  try {
    const parsed = value.trim()
      ? JSON.parse(value)
      : objectOnly
        ? {}
        : undefined
    if (
      objectOnly &&
      (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    )
      throw new Error()
    return parsed
  } catch {
    throw new Error(
      `${label} must contain valid ${objectOnly ? "JSON object" : "JSON"}.`
    )
  }
}

export function pullDraftPayload(
  draft: AttendancePullDraft,
  integrationId?: string
): AttendancePullPayload {
  const headers = parseJson(draft.headersJson, "Headers", true) as Record<
    string,
    unknown
  >
  const query = parseJson(draft.queryJson, "Query parameters", true) as Record<
    string,
    unknown
  >
  const directionMap = parseJson(
    draft.directionMapJson,
    "Direction map",
    true
  ) as Record<string, string>
  const secretValue = draft.secretValue.trim()
  return {
    integrationId,
    name: draft.name.trim(),
    source: draft.source.trim().toUpperCase(),
    endpointUrl: draft.endpointUrl.trim(),
    method: draft.method,
    headers,
    query,
    body:
      draft.method === "POST"
        ? parseJson(draft.bodyJson, "Request body")
        : undefined,
    secret:
      draft.secretKey.trim() && (secretValue || draft.secretConfigured)
        ? {
            location: draft.secretLocation,
            key: draft.secretKey.trim(),
            value: secretValue || undefined,
          }
        : undefined,
    responseItemsPath: draft.responseItemsPath.trim() || null,
    mappings: draft.mappings,
    directionMap,
    cursorResponsePath: draft.cursorResponsePath.trim() || null,
    scheduleIntervalMinutes: draft.scheduleIntervalMinutes
      ? Number(draft.scheduleIntervalMinutes)
      : null,
    isActive: draft.isActive,
  }
}

function suggestedTarget(path: string): AttendancePullTargetField {
  const key = path.toLowerCase().replaceAll("_", "")
  if (key.includes("employee") && key.includes("code")) return "employeeCode"
  if (key.endsWith("employeeid")) return "employeeId"
  if (key.includes("time") || key.includes("date")) return "punchedAt"
  if (key.includes("direction") || key.endsWith("type")) return "direction"
  if (key.includes("device")) return "deviceIdentifier"
  return "externalEventId"
}

export function AttendancePullIntegrationDialog({
  open,
  integration,
  initialDraft,
  saving,
  testing,
  error,
  onOpenChange,
  onSave,
  onTest,
}: {
  open: boolean
  integration: AttendancePullIntegration | null
  initialDraft: AttendancePullDraft
  saving: boolean
  testing: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onSave: (draft: AttendancePullDraft) => void
  onTest: (
    draft: AttendancePullDraft
  ) => Promise<AttendancePullTestResult | null>
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [testResult, setTestResult] = useState<AttendancePullTestResult | null>(
    null
  )
  const [localError, setLocalError] = useState("")
  const update = <K extends keyof AttendancePullDraft>(
    key: K,
    value: AttendancePullDraft[K]
  ) => setDraft((current) => ({ ...current, [key]: value }))
  const mappedByPath = useMemo(
    () =>
      new Map(draft.mappings.map((mapping) => [mapping.sourcePath, mapping])),
    [draft.mappings]
  )
  const togglePath = (path: string, checked: boolean) => {
    if (!checked) {
      update(
        "mappings",
        draft.mappings.filter((mapping) => mapping.sourcePath !== path)
      )
      return
    }
    const used = new Set(draft.mappings.map((mapping) => mapping.targetField))
    const suggested = suggestedTarget(path)
    const targetField = !used.has(suggested)
      ? suggested
      : TARGETS.find((target) => !used.has(target.value))?.value
    if (!targetField) {
      setLocalError("All available attendance fields are already mapped.")
      return
    }
    setLocalError("")
    update("mappings", [...draft.mappings, { sourcePath: path, targetField }])
  }
  const mapTarget = (path: string, targetField: AttendancePullTargetField) =>
    update(
      "mappings",
      draft.mappings
        .filter(
          (mapping) =>
            mapping.sourcePath === path || mapping.targetField !== targetField
        )
        .map((mapping) =>
          mapping.sourcePath === path ? { ...mapping, targetField } : mapping
        )
    )
  const test = async () => {
    setLocalError("")
    try {
      setTestResult(await onTest(draft))
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : "Unable to test the vendor API."
      )
    }
  }
  const save = () => {
    setLocalError("")
    try {
      pullDraftPayload(draft, integration?.id)
      onSave(draft)
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : "Invalid integration settings."
      )
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 left-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 sm:top-1/2 sm:left-1/2 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b px-4 py-5 pr-12 sm:px-6">
            <DialogTitle>
              {integration
                ? "Edit attendance API integration"
                : "Add attendance API integration"}
            </DialogTitle>
            <DialogDescription>
              Pull attendance events from a vendor API and map its response to
              attendance punches.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6">
            {error || localError ? (
              <Alert variant="destructive">
                <AlertDescription>{error || localError}</AlertDescription>
              </Alert>
            ) : null}
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">Endpoint and schedule</h3>
                <p className="text-xs text-muted-foreground">
                  Use HTTPS for public vendor APIs. Private-network URLs require
                  server configuration.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Integration name" required>
                  <Input
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Head office biometric API"
                  />
                </Field>
                <Field label="Unique source" required>
                  <Input
                    value={draft.source}
                    onChange={(event) =>
                      update("source", event.target.value.toUpperCase())
                    }
                    placeholder="ZKTECO_HEAD_OFFICE"
                  />
                </Field>
                <Field
                  label="Vendor endpoint"
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    value={draft.endpointUrl}
                    onChange={(event) =>
                      update("endpointUrl", event.target.value)
                    }
                    placeholder="https://vendor.example.com/api/attendance"
                  />
                </Field>
                <Field label="Request method">
                  <AppSelect
                    value={draft.method}
                    onValueChange={(value) =>
                      update("method", value as "GET" | "POST")
                    }
                    options={[
                      { value: "GET", label: "GET" },
                      { value: "POST", label: "POST" },
                    ]}
                    triggerClassName="h-10 rounded-xl px-3 text-sm"
                  />
                </Field>
                <Field label="Repeat every (minutes)">
                  <Input
                    type="number"
                    min={1}
                    max={10080}
                    value={draft.scheduleIntervalMinutes}
                    onChange={(event) =>
                      update("scheduleIntervalMinutes", event.target.value)
                    }
                    placeholder="Blank for manual sync only"
                  />
                </Field>
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3 sm:col-span-2">
                  <span>
                    <span className="block text-sm font-medium">
                      Active recurring sync
                    </span>
                    <span className="text-xs text-muted-foreground">
                      When enabled, the backend runs this integration at the
                      configured interval.
                    </span>
                  </span>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(value) => update("isActive", value)}
                  />
                </label>
              </div>
            </section>
            <section className="space-y-4 border-t pt-5">
              <div>
                <h3 className="font-semibold">Request configuration</h3>
                <p className="text-xs text-muted-foreground">
                  JSON values support {"{{now}}"}, {"{{lastRunAt}}"},{" "}
                  {"{{lastSuccessAt}}"}, {"{{cursor}}"}, and{" "}
                  {"{{organizationId}}"}.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <JsonField
                  label="Headers (JSON object)"
                  value={draft.headersJson}
                  onChange={(value) => update("headersJson", value)}
                />
                <JsonField
                  label="Query parameters (JSON object)"
                  value={draft.queryJson}
                  onChange={(value) => update("queryJson", value)}
                />
                {draft.method === "POST" ? (
                  <JsonField
                    label="Request body (JSON)"
                    value={draft.bodyJson}
                    onChange={(value) => update("bodyJson", value)}
                    className="sm:col-span-2"
                  />
                ) : null}
                <Field label="Secret location">
                  <AppSelect
                    value={draft.secretLocation}
                    onValueChange={(value) =>
                      update(
                        "secretLocation",
                        value as AttendancePullDraft["secretLocation"]
                      )
                    }
                    options={[
                      { value: "HEADER", label: "Header" },
                      { value: "QUERY", label: "Request parameter" },
                      { value: "BODY", label: "Request body" },
                    ]}
                    triggerClassName="h-10 rounded-xl px-3 text-sm"
                  />
                </Field>
                <Field label="Secret key">
                  <Input
                    value={draft.secretKey}
                    onChange={(event) =>
                      update("secretKey", event.target.value)
                    }
                    placeholder="X-API-Key or api_key"
                  />
                </Field>
                <Field label="Secret value" className="sm:col-span-2">
                  <Input
                    type="password"
                    value={draft.secretValue}
                    onChange={(event) =>
                      update("secretValue", event.target.value)
                    }
                    placeholder={
                      draft.secretConfigured
                        ? "Saved securely; leave blank to keep it"
                        : "Vendor API secret"
                    }
                  />
                </Field>
              </div>
            </section>
            <section className="space-y-4 border-t pt-5">
              <div>
                <h3 className="font-semibold">Response and cursor</h3>
                <p className="text-xs text-muted-foreground">
                  Enter a dot path to the event array. Leave blank when the
                  whole response is the array.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Response items path">
                  <Input
                    value={draft.responseItemsPath}
                    onChange={(event) =>
                      update("responseItemsPath", event.target.value)
                    }
                    placeholder="data.records"
                  />
                </Field>
                <Field label="Next cursor response path">
                  <Input
                    value={draft.cursorResponsePath}
                    onChange={(event) =>
                      update("cursorResponsePath", event.target.value)
                    }
                    placeholder="data.nextCursor"
                  />
                </Field>
                <JsonField
                  label="Direction value map"
                  value={draft.directionMapJson}
                  onChange={(value) => update("directionMapJson", value)}
                  className="sm:col-span-2"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void test()}
                disabled={testing || saving}
              >
                <TestTube2 />
                {testing
                  ? "Testing vendor API..."
                  : "Test request and inspect response"}
              </Button>
              {testResult ? (
                <div className="space-y-4 rounded-xl border p-3 sm:p-4">
                  <div>
                    <h4 className="font-medium">Response mapper</h4>
                    <p className="text-xs text-muted-foreground">
                      {testResult.itemCount} item(s) found. Check a vendor
                      property on the left and choose its internal attendance
                      field on the right.
                    </p>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {testResult.availablePaths.map((path) => {
                      const mapping = mappedByPath.get(path)
                      return (
                        <div
                          key={path}
                          className="grid items-center gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)]"
                        >
                          <label className="flex min-w-0 items-center gap-2">
                            <Checkbox
                              checked={Boolean(mapping)}
                              onCheckedChange={(checked) =>
                                togglePath(path, checked === true)
                              }
                            />
                            <code className="min-w-0 text-xs break-all">
                              {path}
                            </code>
                          </label>
                          <AppSelect
                            value={mapping?.targetField ?? "__none__"}
                            onValueChange={(value) =>
                              mapTarget(
                                path,
                                value as AttendancePullTargetField
                              )
                            }
                            disabled={!mapping}
                            options={[
                              {
                                value: "__none__",
                                label: "Select internal field",
                                disabled: true,
                              },
                              ...TARGETS,
                            ]}
                            triggerClassName="h-9 rounded-lg"
                          />
                        </div>
                      )
                    })}
                  </div>
                  <details>
                    <summary className="cursor-pointer text-xs font-medium">
                      View vendor sample
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px]">
                      {JSON.stringify(testResult.sample, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : null}
              {draft.mappings.length ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Saved mappings</h4>
                  {draft.mappings.map((mapping) => (
                    <div
                      key={`${mapping.sourcePath}-${mapping.targetField}`}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
                    >
                      <code className="min-w-0 break-all">
                        {mapping.sourcePath} → {mapping.targetField}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          update(
                            "mappings",
                            draft.mappings.filter((item) => item !== mapping)
                          )
                        }
                      >
                        <Trash2 />
                        <span className="sr-only">Remove mapping</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
          <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-6 sm:py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving || testing}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              {integration ? "Save changes" : "Create integration"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className ?? ""}`}>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

function JsonField({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Field label={label} className={className}>
      <Textarea
        className="min-h-28 font-mono text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </Field>
  )
}
