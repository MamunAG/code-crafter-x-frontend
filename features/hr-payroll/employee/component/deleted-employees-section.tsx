/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
  UserRound,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import type { EmployeeFilterValues, EmployeeRecord, PaginationMeta } from "../employee.types"

const ALL_FACTORY_VALUE = "__all_deleted_factories__"
const ALL_DESIGNATION_VALUE = "__all_deleted_designations__"
const ALL_DEPARTMENT_VALUE = "__all_deleted_departments__"
const ALL_GENDER_VALUE = "__all_deleted_genders__"
const ALL_STATUS_VALUE = "__all_deleted_statuses__"

type DeletedEmployeeActionMode = "restore" | "permanent"

type LookupOption = {
  value: string
  label: string
}

type DeletedEmployeesSectionProps = {
  deletedEmployees: EmployeeRecord[]
  deletedMeta: PaginationMeta | null
  deletedPage: number
  deletedLimit: number
  loadingDeletedEmployees: boolean
  deletedError: string
  deletedDraftFilters: EmployeeFilterValues
  deletedActiveFilters: EmployeeFilterValues
  factoryOptions: LookupOption[]
  designationOptions: LookupOption[]
  departmentOptions: LookupOption[]
  onDeletedDraftFiltersChange: (nextValues: EmployeeFilterValues) => void
  onDeletedActiveFiltersChange: (nextValues: EmployeeFilterValues) => void
  onDeletedPageChange: (nextPage: number) => void
  onDeletedLimitChange: (nextPageSize: number) => void
  onOpenAction: (employee: EmployeeRecord, mode: DeletedEmployeeActionMode) => void
  canRestoreEmployee: boolean
  canPermanentlyDeleteEmployee: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function getLookupLabel(value: string | null | undefined, options: LookupOption[], fallback: string) {
  if (!value) return fallback
  return options.find((option) => option.value === value)?.label || fallback
}

function getFactoryLabel(employee: EmployeeRecord, factoryOptions: LookupOption[]) {
  return (
    employee.factory?.displayName?.trim() ||
    employee.factory?.name?.trim() ||
    getLookupLabel(employee.factoryId, factoryOptions, "No factory")
  )
}

function getDesignationLabel(employee: EmployeeRecord, designationOptions: LookupOption[]) {
  return (
    employee.designation?.designationName?.trim() ||
    getLookupLabel(employee.designationId, designationOptions, "No designation")
  )
}

function getDepartmentLabel(employee: EmployeeRecord, departmentOptions: LookupOption[]) {
  return (
    employee.department?.departmentName?.trim() ||
    getLookupLabel(employee.departmentId, departmentOptions, "No department")
  )
}

function getUserLabel(user?: { name?: string | null } | null, fallback?: string | null) {
  return user?.name?.trim() || fallback?.trim() || ""
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <UserRound className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

const CLEARED_FILTERS: EmployeeFilterValues = {
  factoryId: "",
  employeeCode: "",
  employeeName: "",
  designationId: "",
  departmentId: "",
  gender: "",
  isActive: "",
}

export function DeletedEmployeesSection({
  deletedEmployees,
  deletedMeta,
  deletedPage,
  deletedLimit,
  loadingDeletedEmployees,
  deletedError,
  deletedDraftFilters,
  deletedActiveFilters,
  factoryOptions,
  designationOptions,
  departmentOptions,
  onDeletedDraftFiltersChange,
  onDeletedActiveFiltersChange,
  onDeletedPageChange,
  onDeletedLimitChange,
  onOpenAction,
  canRestoreEmployee,
  canPermanentlyDeleteEmployee,
}: DeletedEmployeesSectionProps) {
  const deletedPageSummary = useMemo(() => {
    if (!deletedMeta || deletedMeta.total === 0) {
      return "No deleted employees found"
    }

    const start = (deletedMeta.page - 1) * deletedMeta.limit + 1
    const end = Math.min(deletedMeta.page * deletedMeta.limit, deletedMeta.total)
    return `Showing ${start}-${end} of ${deletedMeta.total}`
  }, [deletedMeta])

  const deletedFilterCount = useMemo(
    () =>
      [
        deletedDraftFilters.factoryId,
        deletedDraftFilters.employeeCode,
        deletedDraftFilters.employeeName,
        deletedDraftFilters.designationId,
        deletedDraftFilters.departmentId,
        deletedDraftFilters.gender,
        deletedDraftFilters.isActive,
      ].filter((value) => value.trim()).length,
    [deletedDraftFilters],
  )

  const deletedFiltersActive = Boolean(
    deletedActiveFilters.factoryId ||
    deletedActiveFilters.employeeCode ||
    deletedActiveFilters.employeeName ||
    deletedActiveFilters.designationId ||
    deletedActiveFilters.departmentId ||
    deletedActiveFilters.gender ||
    deletedActiveFilters.isActive,
  )

  const deletedColumns = useMemo<ColumnDef<EmployeeRecord>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="pl-4">
            <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.employeeName}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.employeeCode}</p>
          </div>
        ),
      },
      {
        id: "assignment",
        header: "Assignment",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
              {getFactoryLabel(row.original, factoryOptions)}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {getDesignationLabel(row.original, designationOptions)}
            </p>
          </div>
        ),
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {getDepartmentLabel(row.original, departmentOptions)}
          </span>
        ),
      },
      {
        id: "deleted",
        header: "Deleted",
        cell: ({ row }) => {
          const employee = row.original
          return (
            <div className="space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(employee.deleted_at)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserLabel(employee.deleted_by_user, employee.deleted_by_id)
                  ? `Deleted by ${getUserLabel(employee.deleted_by_user, employee.deleted_by_id)}`
                  : "Deleted item"}
              </p>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const employee = row.original
          const hasActions = canRestoreEmployee || canPermanentlyDeleteEmployee

          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open deleted item actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canRestoreEmployee ? <DropdownMenuItem onSelect={() => onOpenAction(employee, "restore")}>Restore employee</DropdownMenuItem> : null}
                  {canRestoreEmployee && canPermanentlyDeleteEmployee ? <DropdownMenuSeparator /> : null}
                  {canPermanentlyDeleteEmployee ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(employee, "permanent")}>
                      Delete permanently
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [
      canPermanentlyDeleteEmployee,
      canRestoreEmployee,
      departmentOptions,
      designationOptions,
      factoryOptions,
      onOpenAction,
    ],
  )

  const deletedTable = useReactTable({
    data: deletedEmployees,
    columns: deletedColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Deleted employees</CardTitle>
            <CardDescription>{deletedPageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              {deletedMeta?.total ?? deletedEmployees.length} deleted
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {deletedFilterCount} active filter{deletedFilterCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onDeletedActiveFiltersChange(deletedDraftFilters)
            onDeletedPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeFactory" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory</label>
            <AppSelect
              triggerId="deletedEmployeeFactory"
              value={deletedDraftFilters.factoryId || ALL_FACTORY_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, factoryId: value === ALL_FACTORY_VALUE ? "" : value })}
              placeholder="All factories"
              options={[
                { value: ALL_FACTORY_VALUE, label: "All factories" },
                ...factoryOptions,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">Employee code</label>
            <Input id="deletedEmployeeCode" value={deletedDraftFilters.employeeCode} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, employeeCode: event.target.value })} placeholder="Input employee code" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Employee name</label>
            <Input id="deletedEmployeeName" value={deletedDraftFilters.employeeName} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, employeeName: event.target.value })} placeholder="Input employee name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeDesignation" className="text-xs font-medium text-slate-700 dark:text-slate-300">Designation</label>
            <AppSelect
              triggerId="deletedEmployeeDesignation"
              value={deletedDraftFilters.designationId || ALL_DESIGNATION_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, designationId: value === ALL_DESIGNATION_VALUE ? "" : value })}
              placeholder="All designations"
              options={[
                { value: ALL_DESIGNATION_VALUE, label: "All designations" },
                ...designationOptions,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeDepartment" className="text-xs font-medium text-slate-700 dark:text-slate-300">Department</label>
            <AppSelect
              triggerId="deletedEmployeeDepartment"
              value={deletedDraftFilters.departmentId || ALL_DEPARTMENT_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, departmentId: value === ALL_DEPARTMENT_VALUE ? "" : value })}
              placeholder="All departments"
              options={[
                { value: ALL_DEPARTMENT_VALUE, label: "All departments" },
                ...departmentOptions,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="deletedEmployeeStatus"
              value={deletedDraftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="deletedEmployeeGender" className="text-xs font-medium text-slate-700 dark:text-slate-300">Gender</label>
            <AppSelect
              triggerId="deletedEmployeeGender"
              value={deletedDraftFilters.gender || ALL_GENDER_VALUE}
              onValueChange={(value) => onDeletedDraftFiltersChange({ ...deletedDraftFilters, gender: value === ALL_GENDER_VALUE ? "" : value })}
              placeholder="All genders"
              options={[
                { value: ALL_GENDER_VALUE, label: "All genders" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Others", label: "Others" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-5">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => {
                onDeletedDraftFiltersChange(CLEARED_FILTERS)
                onDeletedActiveFiltersChange(CLEARED_FILTERS)
                onDeletedPageChange(1)
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        {deletedError ? (
          <div className="p-4">
            <EmptyState title="Unable to load deleted employees" description={deletedError} />
          </div>
        ) : null}

        {!deletedError ? (
          <>
            <div className="lg:hidden">
              {loadingDeletedEmployees ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : deletedEmployees.length > 0 ? (
                <div className="space-y-3 p-4">
                  {deletedEmployees.map((employee) => (
                    <article
                      key={employee.id}
                      className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{employee.employeeName}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{employee.employeeCode}</p>
                        </div>

                        {canRestoreEmployee || canPermanentlyDeleteEmployee ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">Open deleted item actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canRestoreEmployee ? <DropdownMenuItem onSelect={() => onOpenAction(employee, "restore")}>Restore employee</DropdownMenuItem> : null}
                              {canRestoreEmployee && canPermanentlyDeleteEmployee ? <DropdownMenuSeparator /> : null}
                              {canPermanentlyDeleteEmployee ? (
                                <DropdownMenuItem variant="destructive" onSelect={() => onOpenAction(employee, "permanent")}>
                                  Delete permanently
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="destructive" className="rounded-full px-3 py-1">Deleted</Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">{getFactoryLabel(employee, factoryOptions)}</Badge>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p>Department: {getDepartmentLabel(employee, departmentOptions)}</p>
                        <p>Deleted: {formatDate(employee.deleted_at)}</p>
                        <p>
                          {getUserLabel(employee.deleted_by_user, employee.deleted_by_id)
                            ? `Deleted by ${getUserLabel(employee.deleted_by_user, employee.deleted_by_id)}`
                            : "Deleted item"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="No deleted employees found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted employees will appear here when users remove them."
                    }
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletedPageSummary}</p>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(1)} disabled={loadingDeletedEmployees || deletedPage <= 1}>
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.max(1, deletedPage - 1))} disabled={loadingDeletedEmployees || deletedPage <= 1}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(Math.min(deletedMeta?.totalPages ?? 1, deletedPage + 1))} disabled={loadingDeletedEmployees || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onDeletedPageChange(deletedMeta?.totalPages ?? 1)} disabled={loadingDeletedEmployees || deletedPage >= (deletedMeta?.totalPages ?? 1)}>
                    <ChevronsRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <AppDataTable
                table={deletedTable}
                pageSummary={deletedPageSummary}
                page={deletedPage}
                totalPages={deletedMeta?.totalPages ?? 1}
                pageSize={deletedLimit}
                isLoading={loadingDeletedEmployees}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageChange={(nextPage) => onDeletedPageChange(nextPage)}
                onPageSizeChange={(nextPageSize) => {
                  onDeletedLimitChange(nextPageSize)
                  onDeletedPageChange(1)
                }}
                emptyState={
                  <EmptyState
                    title="No deleted employees found"
                    description={
                      deletedFiltersActive
                        ? "Try clearing or relaxing the current filters."
                        : "Soft deleted employees will appear here when users remove them."
                    }
                  />
                }
                leadingColumnIds={["employee"]}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
