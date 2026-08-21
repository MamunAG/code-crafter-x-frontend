"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getHrAuditLog } from "./audit-log.service"
import type {
  HrAuditEvent,
  HrAuditFeed,
  HrAuditFilters,
} from "./audit-log.types"
import { HrPageHeader } from "../shared/hr-page-header"
import { HrWorkspaceLayout } from "../shared/hr-workspace-layout"
import { useHrWorkspace } from "../shared/use-hr-workspace"

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
})
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
})
const DEFAULT_FILTERS: HrAuditFilters = { page: 1, limit: 50 }

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
}

function statusVariant(status: HrAuditEvent["status"]) {
  if (status === "ERROR" || status === "ABORTED") return "destructive" as const
  if (status === "SUCCESS") return "secondary" as const
  return "outline" as const
}

function scheduleVariant(status: HrAuditEvent["scheduleStatus"]) {
  if (status === "FAILED" || status === "MISSED") return "destructive" as const
  if (status === "ON_SCHEDULE") return "secondary" as const
  return "outline" as const
}

function AuditRow({ event }: { event: HrAuditEvent }) {
  const operation =
    event.category === "CRON"
      ? event.jobName || "Scheduled job"
      : event.category === "API"
        ? event.action || `${event.httpMethod ?? "API"} request`
        : humanize(event.action)
  const subject = `${event.subjectType} · ${event.subjectId}`
  return (
    <TableRow>
      <TableCell className="align-top">
        <time dateTime={event.createdAt} className="block leading-5">
          <span className="block font-medium">
            {DATE_FORMAT.format(new Date(event.createdAt))}
          </span>
          <span className="text-muted-foreground">
            {TIME_FORMAT.format(new Date(event.createdAt))}
          </span>
        </time>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant="outline">{humanize(event.category)}</Badge>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-start gap-1">
          <Badge variant={statusVariant(event.status)}>
            {humanize(event.status)}
          </Badge>
          {event.scheduleStatus ? (
            <Badge variant={scheduleVariant(event.scheduleStatus)}>
              {humanize(event.scheduleStatus)}
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <span
          className="block truncate font-medium"
          title={event.actorName ?? undefined}
        >
          {event.actorName || "Anonymous/System"}
        </span>
        <span
          className="block truncate text-muted-foreground"
          title={event.userAgent ?? undefined}
        >
          {event.clientIp || "—"}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <span className="block truncate font-medium" title={operation}>
          {operation}
        </span>
        <span className="block truncate text-muted-foreground" title={subject}>
          {subject}
        </span>
      </TableCell>
      <TableCell className="align-top">
        {event.category === "API" ? (
          <>
            <span
              className="block truncate font-mono"
              title={event.route ?? undefined}
            >
              {event.httpMethod ?? "API"} {event.route ?? "—"}
            </span>
            <span className="text-muted-foreground">
              HTTP {event.statusCode ?? "—"}
            </span>
          </>
        ) : null}
        {event.category === "CRON" ? (
          <div className="space-y-0.5 leading-4">
            <span
              className="block truncate"
              title={event.schedule ?? undefined}
            >
              {event.schedule ?? "—"}
            </span>
            <span className="block text-muted-foreground">
              Expected{" "}
              {event.scheduledFor
                ? TIME_FORMAT.format(new Date(event.scheduledFor))
                : "—"}
            </span>
            <span className="block text-muted-foreground">
              Started{" "}
              {event.startedAt
                ? TIME_FORMAT.format(new Date(event.startedAt))
                : "—"}{" "}
              · Completed{" "}
              {event.completedAt
                ? TIME_FORMAT.format(new Date(event.completedAt))
                : "—"}
            </span>
          </div>
        ) : null}
        {event.category === "BUSINESS" ? (
          <span className="block truncate" title={subject}>
            {subject}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <span className="block">
          {event.durationMs == null ? "—" : `${event.durationMs} ms`}
        </span>
        <span
          className="block truncate font-mono text-muted-foreground"
          title={event.requestId ?? event.runId ?? undefined}
        >
          {event.requestId ?? event.runId ?? "—"}
        </span>
      </TableCell>
      <TableCell className="align-top">
        {event.errorMessage ? (
          <span
            className="block whitespace-normal text-destructive"
            title={event.errorMessage}
          >
            {event.errorCode ? `${event.errorCode}: ` : ""}
            {event.errorMessage}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

function AuditFilters({
  filters,
  disabled,
  onChange,
}: {
  filters: HrAuditFilters
  disabled: boolean
  onChange: (filters: HrAuditFilters) => void
}) {
  const update = (values: Partial<HrAuditFilters>) =>
    onChange({ ...filters, ...values, page: 1 })
  return (
    <Card size="sm">
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Select
          value={filters.category ?? "ALL"}
          onValueChange={(value) =>
            update({
              category:
                value === "ALL"
                  ? undefined
                  : (value as HrAuditEvent["category"]),
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            <SelectItem value="API">API requests</SelectItem>
            <SelectItem value="BUSINESS">Business activity</SelectItem>
            <SelectItem value="CRON">Cron jobs</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "ALL"}
          onValueChange={(value) =>
            update({
              status:
                value === "ALL" ? undefined : (value as HrAuditEvent["status"]),
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="All results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All results</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="STARTED">Started</SelectItem>
            <SelectItem value="ABORTED">Aborted</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.scheduleStatus ?? "ALL"}
          onValueChange={(value) =>
            update({
              scheduleStatus:
                value === "ALL"
                  ? undefined
                  : (value as Exclude<HrAuditEvent["scheduleStatus"], null>),
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="All schedule states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All schedule states</SelectItem>
            <SelectItem value="ON_SCHEDULE">On schedule</SelectItem>
            <SelectItem value="DELAYED">Delayed</SelectItem>
            <SelectItem value="MISSED">Missed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}

export function AuditLogWorkspace({ apiUrl }: { apiUrl: string }) {
  const { organizationId, context, handleError } = useHrWorkspace(apiUrl)
  const [loadedFeed, setLoadedFeed] = useState<{
    organizationId: string
    feed: HrAuditFeed
  } | null>(null)
  const [filters, setFilters] = useState<HrAuditFilters>(DEFAULT_FILTERS)
  const [loadingOrganization, setLoadingOrganization] = useState<string | null>(
    null
  )
  const feed =
    loadedFeed?.organizationId === organizationId ? loadedFeed.feed : null
  const loading = loadingOrganization === organizationId
  const load = useCallback(async () => {
    if (!organizationId) return
    setLoadingOrganization(organizationId)
    try {
      const nextFeed = await getHrAuditLog(context(), filters)
      setLoadedFeed({ organizationId, feed: nextFeed })
    } catch (error) {
      handleError(error, "Unable to load the HR audit log.")
    } finally {
      setLoadingOrganization((current) =>
        current === organizationId ? null : current
      )
    }
  }, [context, filters, handleError, organizationId])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load])
  return (
    <HrWorkspaceLayout>
      <HrPageHeader
        title="HR Audit Log"
        description="All retained HR and payroll API, business, and scheduled-job activity for the selected organization."
        badges={[
          {
            label: `${feed?.stats.total ?? 0} activities`,
            variant: "secondary",
          },
          { label: `${feed?.stats.cronOnSchedule ?? 0} jobs on schedule` },
          {
            label: `${feed?.stats.issues ?? 0} issues`,
            variant: feed?.stats.issues ? "destructive" : "outline",
          },
        ]}
        actions={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />
      <AuditFilters
        filters={filters}
        disabled={loading}
        onChange={setFilters}
      />
      {loading && !feed ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      ) : feed?.events.length ? (
        <>
          <Card className="overflow-hidden py-0">
            <Table className="min-w-[1360px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[130px]">Date & time</TableHead>
                  <TableHead className="w-[90px]">Category</TableHead>
                  <TableHead className="w-[120px]">Result</TableHead>
                  <TableHead className="w-[150px]">Actor / IP</TableHead>
                  <TableHead className="w-[210px]">
                    Operation / subject
                  </TableHead>
                  <TableHead className="w-[280px]">Route / schedule</TableHead>
                  <TableHead className="w-[180px]">
                    Duration / correlation
                  </TableHead>
                  <TableHead className="w-[200px]">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.events.map((event) => (
                  <AuditRow key={event.id} event={event} />
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Page {feed?.page ?? 1} of {feed?.totalPages ?? 1} ·{" "}
              {feed?.total ?? 0} matching records
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || (feed?.page ?? 1) <= 1}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  loading || (feed?.page ?? 1) >= (feed?.totalPages ?? 1)
                }
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No matching HR or payroll activity was recorded for the selected
            organization.
          </CardContent>
        </Card>
      )}
    </HrWorkspaceLayout>
  )
}
