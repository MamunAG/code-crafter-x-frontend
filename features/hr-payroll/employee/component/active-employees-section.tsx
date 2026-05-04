/* eslint-disable react-hooks/incompatible-library */
"use client"

import { useMemo } from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  MoreHorizontal,
  Search,
  Upload,
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

const ALL_FACTORY_VALUE = "__all_factories__"
const ALL_DESIGNATION_VALUE = "__all_designations__"
const ALL_DEPARTMENT_VALUE = "__all_departments__"
const ALL_GENDER_VALUE = "__all_genders__"
const ALL_STATUS_VALUE = "__all_statuses__"

type LookupOption = {
  value: string
  label: string
}

type ActiveEmployeesSectionProps = {
  employees: EmployeeRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loadingEmployees: boolean
  draftFilters: EmployeeFilterValues
  activeFilters: EmployeeFilterValues
  factoryOptions: LookupOption[]
  designationOptions: LookupOption[]
  departmentOptions: LookupOption[]
  onDraftFiltersChange: (nextValues: EmployeeFilterValues) => void
  onActiveFiltersChange: (nextValues: EmployeeFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onLimitChange: (nextPageSize: number) => void
  onCreateEmployee: () => void
  onEditEmployee: (employeeId: string) => void
  onDeleteEmployee: (employee: EmployeeRecord) => void
  onResetFilters: () => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  canCreateEmployee: boolean
  canUpdateEmployee: boolean
  canDeleteEmployee: boolean
  downloadingTemplate: boolean
  uploadingTemplate: boolean
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
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

function employeeStatusTone(employee?: EmployeeRecord | null) {
  if (!employee) return "outline" as const
  if (employee.deleted_at) return "destructive" as const
  return employee.isActive === false ? "outline" : "secondary"
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
        <UserRound className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

export function ActiveEmployeesSection({
  employees,
  meta,
  page,
  limit,
  loadingEmployees,
  draftFilters,
  activeFilters,
  factoryOptions,
  designationOptions,
  departmentOptions,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onLimitChange,
  onCreateEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onResetFilters,
  onDownloadTemplate,
  onUploadTemplate,
  canCreateEmployee,
  canUpdateEmployee,
  canDeleteEmployee,
  downloadingTemplate,
  uploadingTemplate,
}: ActiveEmployeesSectionProps) {
  const filterCount = useMemo(
    () =>
      [
        draftFilters.factoryId,
        draftFilters.employeeCode,
        draftFilters.employeeName,
        draftFilters.designationId,
        draftFilters.departmentId,
        draftFilters.gender,
        draftFilters.isActive,
      ].filter((value) => value.trim()).length,
    [draftFilters],
  )

  const filtersActive = Boolean(
    activeFilters.factoryId ||
    activeFilters.employeeCode ||
    activeFilters.employeeName ||
    activeFilters.designationId ||
    activeFilters.departmentId ||
    activeFilters.gender ||
    activeFilters.isActive,
  )

  const pageSummary = useMemo(() => {
    if (!meta || meta.total === 0) return "No employees found"
    const start = (meta.page - 1) * meta.limit + 1
    const end = Math.min(meta.page * meta.limit, meta.total)
    return `Showing ${start}-${end} of ${meta.total}`
  }, [meta])

  const columns = useMemo<ColumnDef<EmployeeRecord>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="pl-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                {(row.original.employeeName?.trim() || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{row.original.employeeName}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.employeeCode}</p>
              </div>
            </div>
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
        id: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs text-slate-700 dark:text-slate-200">{row.original.phoneNo || "No phone"}</p>
            <p className="max-w-44 truncate text-[11px] text-slate-500 dark:text-slate-400">{row.original.email || "No email"}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const employee = row.original
          const label = employee.deleted_at ? "Deleted" : employee.isActive === false ? "Inactive" : "Active"
          return <Badge variant={employeeStatusTone(employee)} className="rounded-full px-3 py-1">{label}</Badge>
        },
      },
      {
        id: "joining",
        header: "Joining",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs text-slate-700 dark:text-slate-200">{formatDate(row.original.joiningDate)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.original.gender || "No gender"}</p>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="pr-4">Actions</span>,
        cell: ({ row }) => {
          const employee = row.original
          const hasActions = canUpdateEmployee || canDeleteEmployee

          if (!hasActions) {
            return <div className="pr-4 text-right text-xs text-slate-400 dark:text-slate-500">No actions</div>
          }

          return (
            <div className="pr-4 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canUpdateEmployee ? <DropdownMenuItem onSelect={() => onEditEmployee(employee.id)}>Edit employee</DropdownMenuItem> : null}
                  {canUpdateEmployee && canDeleteEmployee ? <DropdownMenuSeparator /> : null}
                  {canDeleteEmployee ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeleteEmployee(employee)}>
                      Delete employee
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
      canDeleteEmployee,
      canUpdateEmployee,
      departmentOptions,
      designationOptions,
      factoryOptions,
      onDeleteEmployee,
      onEditEmployee,
    ],
  )

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Employees table</CardTitle>
            <CardDescription>{pageSummary}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Page {meta?.totalPages ? meta.page : 0} of {meta?.totalPages ?? 0}
            </Badge>
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
              {filterCount} active filter{filterCount === 1 ? "" : "s"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="rounded-full" disabled={!canCreateEmployee}>
                  <MoreHorizontal className="size-2.5" />
                  <span className="sr-only">Open employee bulk actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={onDownloadTemplate} disabled={downloadingTemplate}>
                  <Download className="mr-2 size-3.5" />
                  {downloadingTemplate ? "Downloading template..." : "Download template"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUploadTemplate} disabled={uploadingTemplate}>
                  <Upload className="mr-2 size-3.5" />
                  {uploadingTemplate ? "Uploading employees..." : "Upload employees"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onActiveFiltersChange(draftFilters)
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeFactory" className="text-xs font-medium text-slate-700 dark:text-slate-300">Factory</label>
            <AppSelect
              triggerId="filterEmployeeFactory"
              value={draftFilters.factoryId || ALL_FACTORY_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, factoryId: value === ALL_FACTORY_VALUE ? "" : value })}
              placeholder="All factories"
              options={[
                { value: ALL_FACTORY_VALUE, label: "All factories" },
                ...factoryOptions,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">Employee code</label>
            <Input id="filterEmployeeCode" value={draftFilters.employeeCode} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, employeeCode: event.target.value })} placeholder="Input employee code" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeName" className="text-xs font-medium text-slate-700 dark:text-slate-300">Employee name</label>
            <Input id="filterEmployeeName" value={draftFilters.employeeName} className="h-7 rounded-md px-2 text-xs" onChange={(event) => onDraftFiltersChange({ ...draftFilters, employeeName: event.target.value })} placeholder="Input employee name" />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeDesignation" className="text-xs font-medium text-slate-700 dark:text-slate-300">Designation</label>
            <AppSelect
              triggerId="filterEmployeeDesignation"
              value={draftFilters.designationId || ALL_DESIGNATION_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, designationId: value === ALL_DESIGNATION_VALUE ? "" : value })}
              placeholder="All designations"
              options={[
                { value: ALL_DESIGNATION_VALUE, label: "All designations" },
                ...designationOptions,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeDepartment" className="text-xs font-medium text-slate-700 dark:text-slate-300">Department</label>
            <AppSelect
              triggerId="filterEmployeeDepartment"
              value={draftFilters.departmentId || ALL_DEPARTMENT_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, departmentId: value === ALL_DEPARTMENT_VALUE ? "" : value })}
              placeholder="All departments"
              options={[
                { value: ALL_DEPARTMENT_VALUE, label: "All departments" },
                ...departmentOptions,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <AppSelect
              triggerId="filterEmployeeStatus"
              value={draftFilters.isActive || ALL_STATUS_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, isActive: value === ALL_STATUS_VALUE ? "" : value })}
              placeholder="All statuses"
              options={[
                { value: ALL_STATUS_VALUE, label: "All statuses" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterEmployeeGender" className="text-xs font-medium text-slate-700 dark:text-slate-300">Gender</label>
            <AppSelect
              triggerId="filterEmployeeGender"
              value={draftFilters.gender || ALL_GENDER_VALUE}
              onValueChange={(value) => onDraftFiltersChange({ ...draftFilters, gender: value === ALL_GENDER_VALUE ? "" : value })}
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
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
              Reset
            </Button>
            {canCreateEmployee ? (
              <Button type="button" onClick={onCreateEmployee} className="w-full rounded-xl sm:w-auto">
                <UserRound className="size-3.5" />
                New employee
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-0 dark:border-white/10">
        <div className="lg:hidden">
          {loadingEmployees ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : employees.length > 0 ? (
            <div className="space-y-3 p-4">
              {employees.map((employee) => {
                const label = employee.deleted_at ? "Deleted" : employee.isActive === false ? "Inactive" : "Active"

                return (
                  <article
                    key={employee.id}
                    className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                            {(employee.employeeName?.trim() || "?").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{employee.employeeName}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{employee.employeeCode}</p>
                          </div>
                        </div>
                      </div>

                      {canUpdateEmployee || canDeleteEmployee ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canUpdateEmployee ? <DropdownMenuItem onSelect={() => onEditEmployee(employee.id)}>Edit employee</DropdownMenuItem> : null}
                            {canUpdateEmployee && canDeleteEmployee ? <DropdownMenuSeparator /> : null}
                            {canDeleteEmployee ? <DropdownMenuItem variant="destructive" onSelect={() => onDeleteEmployee(employee)}>Delete employee</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={employeeStatusTone(employee)} className="rounded-full px-3 py-1">{label}</Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">{getFactoryLabel(employee, factoryOptions)}</Badge>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p>Department: {getDepartmentLabel(employee, departmentOptions)}</p>
                      <p>Designation: {getDesignationLabel(employee, designationOptions)}</p>
                      <p>Joining: {formatDate(employee.joiningDate)}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No employees found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateEmployee
                      ? "Create the first employee to get started."
                      : "No employee records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateEmployee ? "Reset filters" : "New employee"}
                onAction={filtersActive || !canCreateEmployee ? onResetFilters : onCreateEmployee}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">{pageSummary}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(1)} disabled={loadingEmployees || page <= 1}>
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.max(1, current - 1))} disabled={loadingEmployees || page <= 1}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange((current) => Math.min(meta?.totalPages ?? 1, current + 1))} disabled={loadingEmployees || page >= (meta?.totalPages ?? 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => onPageChange(meta?.totalPages ?? 1)} disabled={loadingEmployees || page >= (meta?.totalPages ?? 1)}>
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <AppDataTable
            table={table}
            pageSummary={pageSummary}
            page={page}
            totalPages={meta?.totalPages ?? 1}
            pageSize={limit}
            isLoading={loadingEmployees}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(nextPage) => onPageChange(nextPage)}
            onPageSizeChange={(nextPageSize) => onLimitChange(nextPageSize)}
            emptyState={
              <EmptyState
                title="No employees found"
                description={
                  filtersActive
                    ? "Try clearing or relaxing the current filters."
                    : canCreateEmployee
                      ? "Create the first employee to get started."
                      : "No employee records are available for the selected organization."
                }
                actionLabel={filtersActive || !canCreateEmployee ? "Reset filters" : "New employee"}
                onAction={filtersActive || !canCreateEmployee ? onResetFilters : onCreateEmployee}
              />
            }
            leadingColumnIds={["employee"]}
          />
        </div>
      </CardContent>
    </Card>
  )
}
