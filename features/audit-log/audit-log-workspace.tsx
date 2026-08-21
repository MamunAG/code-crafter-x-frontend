"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { AppDataSection } from "@/components/app-data-section"
import { AppConfirmDialog } from "@/components/app-confirm-dialog"
import { ModulePageHeader } from "@/components/module-page-header"
import { ModuleWorkspaceLayout } from "@/components/module-workspace-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { parseStoredAuthUser } from "@/lib/auth-session"
import {
  deleteAllAuditLogs,
  deleteSelectedAuditLogs,
  getAuditLog,
} from "./audit-log.service"
import type { AuditEvent, AuditFeed, AuditFilters } from "./audit-log.types"
import type { AuditLogModuleConfig } from "./audit-log.config"
import { useAuditLogWorkspace } from "./use-audit-log-workspace"

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
const DEFAULT_FILTERS: AuditFilters = { page: 1, limit: 10 }

export type AuditLogWorkspaceProps = {
  apiUrl: string
  config: AuditLogModuleConfig
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
}

function statusVariant(status: AuditEvent["status"]) {
  if (status === "ERROR" || status === "ABORTED") return "destructive" as const
  if (status === "SUCCESS") return "secondary" as const
  return "outline" as const
}

function scheduleVariant(status: AuditEvent["scheduleStatus"]) {
  if (status === "FAILED" || status === "MISSED") return "destructive" as const
  if (status === "ON_SCHEDULE") return "secondary" as const
  return "outline" as const
}

function auditOperation(event: AuditEvent) {
  return event.category === "CRON"
    ? event.jobName || "Scheduled job"
    : event.category === "API"
      ? event.action || `${event.httpMethod ?? "API"} request`
      : humanize(event.action)
}

function auditSubject(event: AuditEvent) {
  return `${event.subjectType} · ${event.subjectId}`
}

const AUDIT_COLUMNS: ColumnDef<AuditEvent>[] = [
  {
    id: "createdAt",
    header: "Date & time",
    cell: ({ row }) => {
      const event = row.original
      return (
        <time
          dateTime={event.createdAt}
          className="block truncate font-medium whitespace-nowrap"
        >
          {DATE_FORMAT.format(new Date(event.createdAt))}{" "}
          <span className="font-normal text-muted-foreground">
            {TIME_FORMAT.format(new Date(event.createdAt))}
          </span>
        </time>
      )
    },
  },
  {
    id: "module",
    header: "Module",
    cell: ({ row }) => (
      <Badge variant="outline">{humanize(row.original.moduleName)}</Badge>
    ),
  },
  {
    id: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline">{humanize(row.original.category)}</Badge>
    ),
  },
  {
    id: "result",
    header: "Result",
    cell: ({ row }) => {
      const event = row.original
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Badge variant={statusVariant(event.status)}>
            {humanize(event.status)}
          </Badge>
          {event.scheduleStatus ? (
            <Badge variant={scheduleVariant(event.scheduleStatus)}>
              {humanize(event.scheduleStatus)}
            </Badge>
          ) : null}
        </div>
      )
    },
  },
  {
    id: "actor",
    header: "Actor / IP",
    cell: ({ row }) => {
      const event = row.original
      const actor = `${event.actorName || "Anonymous/System"} · ${event.clientIp || "—"}`
      return (
        <span className="block truncate font-medium" title={actor}>
          {event.actorName || "Anonymous/System"}{" "}
          <span className="font-normal text-muted-foreground">
            · {event.clientIp || "—"}
          </span>
        </span>
      )
    },
  },
  {
    id: "operation",
    header: "Operation / subject",
    cell: ({ row }) => {
      const event = row.original
      const operation = auditOperation(event)
      const subject = auditSubject(event)
      const details = `${operation} · ${subject}`
      return (
        <span className="block truncate font-medium" title={details}>
          {operation}{" "}
          <span className="font-normal text-muted-foreground">· {subject}</span>
        </span>
      )
    },
  },
  {
    id: "route",
    header: "Route / schedule",
    cell: ({ row }) => {
      const event = row.original
      if (event.category === "API") {
        const details = `${event.httpMethod ?? "API"} ${event.route ?? "—"} · HTTP ${event.statusCode ?? "—"}`
        return (
          <span className="block truncate font-mono" title={details}>
            {details}
          </span>
        )
      }
      if (event.category === "CRON") {
        const details = [
          event.schedule ?? "—",
          `Expected ${event.scheduledFor ? TIME_FORMAT.format(new Date(event.scheduledFor)) : "—"}`,
          `Started ${event.startedAt ? TIME_FORMAT.format(new Date(event.startedAt)) : "—"}`,
          `Completed ${event.completedAt ? TIME_FORMAT.format(new Date(event.completedAt)) : "—"}`,
        ].join(" · ")
        return (
          <span className="block truncate" title={details}>
            {details}
          </span>
        )
      }
      return <span className="block truncate">{auditSubject(event)}</span>
    },
  },
  {
    id: "duration",
    header: "Duration / correlation",
    cell: ({ row }) => {
      const event = row.original
      const duration = event.durationMs == null ? "—" : `${event.durationMs} ms`
      const correlation = event.requestId ?? event.runId ?? "—"
      const details = `${duration} · ${correlation}`
      return (
        <span className="block truncate" title={details}>
          {duration}{" "}
          <span className="font-mono text-muted-foreground">
            · {correlation}
          </span>
        </span>
      )
    },
  },
  {
    id: "error",
    header: "Error",
    cell: ({ row }) => {
      const event = row.original
      return event.errorMessage ? (
        <span
          className="block truncate whitespace-nowrap text-destructive"
          title={event.errorMessage}
        >
          {event.errorCode ? `${event.errorCode}: ` : ""}
          {event.errorMessage}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
]

function AuditMobileCard({
  event,
  selectable,
  selected,
  onSelectedChange,
  showModule,
}: {
  event: AuditEvent
  selectable: boolean
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  showModule: boolean
}) {
  const operation = auditOperation(event)
  const subject = auditSubject(event)
  const correlationId = event.requestId ?? event.runId

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {selectable ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(checked === true)}
              aria-label={`Select audit log from ${DATE_FORMAT.format(new Date(event.createdAt))}`}
            />
          ) : null}
          <time
            dateTime={event.createdAt}
            className="min-w-0 text-xs leading-5"
          >
            <span className="block font-medium">
              {DATE_FORMAT.format(new Date(event.createdAt))}
            </span>
            <span className="text-muted-foreground">
              {TIME_FORMAT.format(new Date(event.createdAt))}
            </span>
          </time>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {showModule ? (
            <Badge variant="outline">{humanize(event.moduleName)}</Badge>
          ) : null}
          <Badge variant="outline">{humanize(event.category)}</Badge>
          <Badge variant={statusVariant(event.status)}>
            {humanize(event.status)}
          </Badge>
          {event.scheduleStatus ? (
            <Badge variant={scheduleVariant(event.scheduleStatus)}>
              {humanize(event.scheduleStatus)}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium break-words">{operation}</p>
        <p className="mt-0.5 text-xs break-all text-muted-foreground">
          {subject}
        </p>
      </div>

      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Actor</dt>
          <dd className="truncate font-medium">
            {event.actorName || "Anonymous/System"}
          </dd>
          <dd className="truncate text-muted-foreground">
            {event.clientIp || "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="font-medium">
            {event.durationMs == null ? "—" : `${event.durationMs} ms`}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-muted-foreground">
            {event.category === "CRON" ? "Schedule" : "Route"}
          </dt>
          <dd className="font-mono break-all">
            {event.category === "API"
              ? `${event.httpMethod ?? "API"} ${event.route ?? "—"}`
              : event.category === "CRON"
                ? event.schedule || "—"
                : subject}
          </dd>
          {event.category === "API" ? (
            <dd className="text-muted-foreground">
              HTTP {event.statusCode ?? "—"}
            </dd>
          ) : null}
        </div>
        {correlationId ? (
          <div className="col-span-2 min-w-0">
            <dt className="text-muted-foreground">Correlation</dt>
            <dd className="font-mono break-all">{correlationId}</dd>
          </div>
        ) : null}
      </dl>

      {event.errorMessage ? (
        <p className="border-t pt-3 text-xs break-words text-destructive">
          {event.errorCode ? `${event.errorCode}: ` : ""}
          {event.errorMessage}
        </p>
      ) : null}
    </article>
  )
}

function AuditFilters({
  filters,
  disabled,
  onChange,
}: {
  filters: AuditFilters
  disabled: boolean
  onChange: (filters: AuditFilters) => void
}) {
  const update = (values: Partial<AuditFilters>) =>
    onChange({ ...filters, ...values, page: 1 })
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
      <Select
        value={filters.category ?? "ALL"}
        onValueChange={(value) =>
          update({
            category:
              value === "ALL" ? undefined : (value as AuditEvent["category"]),
          })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-full sm:w-44">
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
              value === "ALL" ? undefined : (value as AuditEvent["status"]),
          })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-full sm:w-40">
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
                : (value as Exclude<AuditEvent["scheduleStatus"], null>),
          })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-full sm:w-52">
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
      <label className="flex w-full items-center gap-2 sm:w-auto">
        <span className="shrink-0 text-xs text-muted-foreground">From</span>
        <Input
          type="date"
          aria-label="Audit log from date"
          value={filters.fromDate ?? ""}
          max={filters.toDate}
          onChange={(event) =>
            update({ fromDate: event.target.value || undefined })
          }
          disabled={disabled}
          className="w-full sm:w-36"
        />
      </label>
      <label className="flex w-full items-center gap-2 sm:w-auto">
        <span className="shrink-0 text-xs text-muted-foreground">To</span>
        <Input
          type="date"
          aria-label="Audit log to date"
          value={filters.toDate ?? ""}
          min={filters.fromDate}
          onChange={(event) =>
            update({ toDate: event.target.value || undefined })
          }
          disabled={disabled}
          className="w-full sm:w-36"
        />
      </label>
    </div>
  )
}

export function AuditLogWorkspace({ apiUrl, config }: AuditLogWorkspaceProps) {
  const { organizationId, context, handleError } = useAuditLogWorkspace(apiUrl)
  const [loadedFeed, setLoadedFeed] = useState<{
    organizationId: string
    feed: AuditFeed
  } | null>(null)
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS)
  const [loadingOrganization, setLoadingOrganization] = useState<string | null>(
    null
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [deleteMode, setDeleteMode] = useState<"selected" | "all" | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const feed =
    loadedFeed?.organizationId === organizationId ? loadedFeed.feed : null
  const visibleEvents = useMemo(
    () => (feed?.events ?? []).slice(0, filters.limit),
    [feed?.events, filters.limit]
  )
  const pageIds = useMemo(
    () => visibleEvents.map((event) => event.id),
    [visibleEvents]
  )
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length
  const allPageSelected =
    pageIds.length > 0 && selectedOnPage === pageIds.length
  const somePageSelected = selectedOnPage > 0 && !allPageSelected
  const loading = loadingOrganization === organizationId
  const moduleName = config.moduleName === "ALL" ? undefined : config.moduleName
  const toggleSelected = useCallback((id: string, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const togglePage = useCallback(
    (selected: boolean) => {
      setSelectedIds((current) => {
        const next = new Set(current)
        pageIds.forEach((id) => {
          if (selected) next.add(id)
          else next.delete(id)
        })
        return next
      })
    },
    [pageIds]
  )
  const columns = useMemo<ColumnDef<AuditEvent>[]>(() => {
    const auditColumns = config.showModuleColumn
      ? AUDIT_COLUMNS
      : AUDIT_COLUMNS.filter((column) => column.id !== "module")

    return canDelete
      ? [
          {
            id: "select",
            header: () => (
              <Checkbox
                checked={
                  allPageSelected
                    ? true
                    : somePageSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(checked) => togglePage(checked === true)}
                aria-label="Select all audit logs on this page"
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                checked={selectedIds.has(row.original.id)}
                onCheckedChange={(checked) =>
                  toggleSelected(row.original.id, checked === true)
                }
                aria-label={`Select audit log ${row.original.id}`}
              />
            ),
          },
          ...auditColumns,
        ]
      : auditColumns
  }, [
    allPageSelected,
    canDelete,
    config.showModuleColumn,
    selectedIds,
    somePageSelected,
    togglePage,
    toggleSelected,
  ])
  const load = useCallback(async () => {
    if (!organizationId) return
    setLoadingOrganization(organizationId)
    try {
      const nextFeed = await getAuditLog(
        context(),
        config.endpoint,
        moduleName,
        filters
      )
      setLoadedFeed({ organizationId, feed: nextFeed })
    } catch (error) {
      handleError(error, `Unable to load the ${config.title}.`)
    } finally {
      setLoadingOrganization((current) =>
        current === organizationId ? null : current
      )
    }
  }, [
    config.endpoint,
    config.title,
    context,
    filters,
    handleError,
    moduleName,
    organizationId,
  ])
  useEffect(() => {
    const pending = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(pending)
  }, [load])
  useEffect(() => {
    const pending = window.setTimeout(
      () =>
        setCanDelete(
          parseStoredAuthUser(window.localStorage.getItem("auth_user"))
            ?.role === "admin"
        ),
      0
    )
    return () => window.clearTimeout(pending)
  }, [])
  useEffect(() => {
    const pending = window.setTimeout(() => {
      setSelectedIds(new Set())
      setDeleteMode(null)
    }, 0)
    return () => window.clearTimeout(pending)
  }, [organizationId])

  const confirmDelete = useCallback(async () => {
    if (!deleteMode || deleting) return
    setDeleting(true)
    try {
      const result =
        deleteMode === "all"
          ? await deleteAllAuditLogs(context(), config.endpoint, moduleName)
          : await deleteSelectedAuditLogs(
              context(),
              config.endpoint,
              moduleName,
              [...selectedIds]
            )
      toast.success(
        `${result.deleted} audit ${result.deleted === 1 ? "log" : "logs"} permanently deleted.`
      )
      setSelectedIds(new Set())
      setDeleteMode(null)
      if (deleteMode === "all" && filters.page !== 1) {
        setLoadedFeed(null)
        setFilters((current) => ({ ...current, page: 1 }))
      } else {
        await load()
      }
    } catch (error) {
      handleError(error, `Unable to delete the ${config.title}.`)
    } finally {
      setDeleting(false)
    }
  }, [
    config.endpoint,
    config.title,
    context,
    deleteMode,
    deleting,
    filters.page,
    handleError,
    load,
    moduleName,
    selectedIds,
  ])
  return (
    <ModuleWorkspaceLayout>
      <ModulePageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
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
      <AppDataSection
        title="Audit activity"
        description={config.activityDescription}
        headerActions={
          canDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={deleting}
                >
                  <MoreHorizontal /> Delete options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  variant="destructive"
                  disabled={selectedIds.size === 0}
                  onSelect={() => setDeleteMode("selected")}
                >
                  <Trash2 /> Delete selected ({selectedIds.size})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={(feed?.stats.total ?? 0) === 0}
                  onSelect={() => setDeleteMode("all")}
                >
                  <Trash2 /> Delete all {config.moduleLabel} audit logs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
        data={visibleEvents}
        columns={columns}
        loading={loading}
        controlsDisabled={loading}
        filters={
          <AuditFilters
            filters={filters}
            disabled={loading}
            onChange={setFilters}
          />
        }
        emptyState={
          <div className="py-8 text-center text-sm text-muted-foreground">
            No matching {config.moduleLabel} activity was recorded for the
            selected organization.
          </div>
        }
        renderMobileItem={(event) => (
          <AuditMobileCard
            event={event}
            selectable={canDelete}
            selected={selectedIds.has(event.id)}
            onSelectedChange={(selected) => toggleSelected(event.id, selected)}
            showModule={config.showModuleColumn === true}
          />
        )}
        getRowId={(event) => event.id}
        pageSummary={`Page ${feed?.page ?? 1} of ${feed?.totalPages ?? 1} · ${feed?.total ?? 0} matching records`}
        page={feed?.page ?? filters.page}
        totalPages={feed?.totalPages ?? 1}
        pageSize={filters.limit}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        onPageSizeChange={(limit) =>
          setFilters((current) => ({ ...current, limit, page: 1 }))
        }
        loadingRows={8}
        leadingColumnIds={canDelete ? ["select"] : ["createdAt"]}
        trailingColumnIds={[]}
        columnClassNames={{
          select: "w-10 align-middle",
          createdAt: "w-[180px] align-middle",
          category: "w-[90px] align-middle",
          module: "w-[140px] align-middle",
          result: "w-[150px] align-middle",
          actor: "w-[180px] align-middle",
          operation: "w-[240px] align-middle",
          route: "w-[280px] align-middle",
          duration: "w-[220px] align-middle",
          error: "w-[180px] align-middle",
        }}
      />
      <AppConfirmDialog
        open={deleteMode !== null}
        title={
          deleteMode === "all"
            ? `Delete all ${config.moduleLabel} audit logs?`
            : "Delete selected audit logs?"
        }
        description={
          deleteMode === "all"
            ? `This permanently deletes all ${feed?.stats.total ?? 0} ${config.moduleLabel} audit logs for the selected organization. This action cannot be undone.`
            : `This permanently deletes ${selectedIds.size} selected audit ${selectedIds.size === 1 ? "log" : "logs"}. This action cannot be undone.`
        }
        confirmLabel={
          deleteMode === "all" ? "Delete all logs" : "Delete selected"
        }
        working={deleting}
        destructive
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteMode(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </ModuleWorkspaceLayout>
  )
}
