"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Edit3, Loader2, Plus, RefreshCcw, Trash2, Undo2, Users } from "lucide-react"
import { toast } from "sonner"

import type {
  AppComboboxLoadParams,
  AppComboboxLoadResult,
  AppComboboxOption,
} from "@/components/app-combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentMenuPermission } from "@/features/iam/menu-permissions/menu-permission.service"
import { createFactory, fetchFactories } from "@/features/app-config/factory/factory.service"
import { createDepartment, fetchDepartments } from "@/features/app-config/departments/department.service"
import { createDesignation, fetchDesignations } from "@/features/app-config/designations/designation.service"
import type { FactoryRecord } from "@/features/app-config/factory/factory.types"
import type { DepartmentRecord } from "@/features/app-config/departments/department.types"
import type { DesignationRecord } from "@/features/app-config/designations/designation.types"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveEmployeesSection } from "./component/active-employees-section"
import { DeletedEmployeesSection } from "./component/deleted-employees-section"
import { EmployeeFormDialog } from "./component/employee-form-dialog"
import {
  createEmployee,
  downloadEmployeeUploadTemplate,
  EmployeeUploadReportError,
  fetchEmployee,
  fetchEmployees,
  permanentlyDeleteEmployee,
  restoreEmployee,
  uploadEmployeeImageFile,
  uploadEmployeeTemplate,
  softDeleteEmployee,
  updateEmployee,
} from "./employee.service"
import type {
  EmployeeFilterValues,
  EmployeeFormValues,
  EmployeeUploadReport,
  EmployeeRecord,
  PaginationMeta,
} from "./employee.types"

type EmployeeEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"
type EmployeeAccessRules = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

type LookupOption = {
  value: string
  label: string
}

type MissingSetupKind = "factory" | "department" | "designation"

type MissingSetupItem = {
  kind: MissingSetupKind
  label: string
  value: string
}

type FactoryOption = AppComboboxOption
type DesignationOption = AppComboboxOption
type DepartmentOption = AppComboboxOption
type GenderOption = AppComboboxOption

type BackendFilePreview = {
  public_url?: string | null
  file_url?: string | null
  thumbnail_url?: string | null
}

function resolveFilePreviewUrl(file?: BackendFilePreview | null) {
  return file?.public_url?.trim() || file?.file_url?.trim() || file?.thumbnail_url?.trim() || ""
}

const MENU_NAME = "Employee Setup"

const EMPTY_ACCESS_RULES: EmployeeAccessRules = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

const DEFAULT_FILTERS: EmployeeFilterValues = {
  factoryId: "",
  employeeCode: "",
  employeeName: "",
  designationId: "",
  departmentId: "",
  gender: "",
  isActive: "",
}

const DEFAULT_FORM_VALUES: EmployeeFormValues = {
  factoryId: "",
  imageId: "",
  employeeCode: "",
  employeeName: "",
  designationId: "",
  departmentId: "",
  phoneNo: "",
  email: "",
  gender: "",
  joiningDate: "",
  nidNo: "",
  address: "",
  remarks: "",
  isActive: true,
}

function normalizeAuthFailure(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function getEmployeeLabel(employee: EmployeeRecord) {
  return employee.employeeName
}

function optionLabelFromFactory(factory: FactoryRecord) {
  return factory.displayName?.trim() || factory.name
}

function toFactoryOption(factory: FactoryRecord): FactoryOption {
  return {
    label: optionLabelFromFactory(factory),
    value: factory.id,
  }
}

function toDesignationOption(designation: DesignationRecord): DesignationOption {
  return {
    label: optionLabelFromDesignation(designation),
    value: designation.id,
  }
}

function toDepartmentOption(department: DepartmentRecord): DepartmentOption {
  return {
    label: optionLabelFromDepartment(department),
    value: department.id,
  }
}

function toGenderOption(gender: string): GenderOption {
  return {
    label: gender,
    value: gender,
  }
}

function optionLabelFromDepartment(department: DepartmentRecord) {
  return department.departmentName
}

function optionLabelFromDesignation(designation: DesignationRecord) {
  return designation.designationName
}

function genderLabel(gender?: string | null) {
  return gender || "Not set"
}

function getMissingSetupKey(item: MissingSetupItem) {
  return `${item.kind}:${item.value.trim().toLowerCase()}`
}

function lookupLabel(value: string, options: LookupOption[]) {
  return options.find((option) => option.value === value)?.label || "Not set"
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set"
  }

  return value
}

function buildEmployeeUploadSkippedMessage(report: EmployeeUploadReport) {
  const duplicateEmployees = report.skippedReasons?.duplicateEmployees ?? []
  const missingRequiredRows = report.skippedReasons?.missingRequiredRows ?? 0
  const invalidJoiningDateRows = report.skippedReasons?.invalidJoiningDateRows ?? 0

  if (duplicateEmployees.length) {
    const sample = duplicateEmployees.slice(0, 3).join(", ")
    const extraCount = duplicateEmployees.length - 3
    const extraText = extraCount > 0 ? ` and ${extraCount} more` : ""

    return `No new employees were inserted.`
  }

  if (missingRequiredRows > 0) {
    return `No employees were inserted because ${missingRequiredRows} row${missingRequiredRows === 1 ? "" : "s"} missed required data. Please provide factory, employee code, and employee name.`
  }

  if (invalidJoiningDateRows > 0) {
    return `No employees were inserted because ${invalidJoiningDateRows} row${invalidJoiningDateRows === 1 ? "" : "s"} had an invalid joining date. Please use a valid date format and upload again.`
  }

  return `No employees were inserted. ${report.skipped} row${report.skipped === 1 ? "" : "s"} skipped. Please verify the factory, department, designation, employee code, and required fields, then upload again.`
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
        <Users className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
        {actionLabel}
      </Button>
    </div>
  )
}

function LoadingCard() {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-4 w-72 rounded-full" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-7 rounded-md" />
            <Skeleton className="h-7 rounded-md" />
            <Skeleton className="h-7 rounded-md" />
            <Skeleton className="h-7 rounded-md" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeleteConfirmDialog({
  open,
  employee,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  employee: EmployeeRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete employee</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {employee ? getEmployeeLabel(employee) : "this employee"}
            </span>
            . You can restore it from the recently deleted card before removing it permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={working}>
            {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function RecentlyDeletedDialog({
  open,
  action,
  employee,
  working,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  action: PendingDeleteMode
  employee: EmployeeRecord | null
  working: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const title = action === "restore" ? "Restore employee" : "Delete employee permanently"
  const description =
    action === "restore"
      ? "Bring this employee back into the active HR payroll list."
      : "This will permanently remove the employee record and cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {employee ? getEmployeeLabel(employee) : "this employee"}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={action === "restore" ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={working}
          >
            {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {action === "restore" ? "Restore" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MissingUploadSetupSection({
  title,
  items,
  savingKeys,
  savedKeys,
  errors,
  onSave,
}: {
  title: string
  items: MissingSetupItem[]
  savingKeys: Set<string>
  savedKeys: Set<string>
  errors: Record<string, string>
  onSave: (item: MissingSetupItem) => void
}) {
  if (!items.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</p>
        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
          {items.length} missing
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const key = getMissingSetupKey(item)
          const saving = savingKeys.has(key)
          const saved = savedKeys.has(key)
          const error = errors[key]

          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-950 dark:text-slate-50">
                      {item.value}
                    </p>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                      {item.label}
                    </Badge>
                  </div>
                  {error ? (
                    <p className="mt-1 text-xs leading-5 text-destructive">{error}</p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={saved ? "outline" : "default"}
                  className="h-8 rounded-xl"
                  disabled={saving || saved}
                  onClick={() => onSave(item)}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {saved ? <Check className="size-3.5" /> : null}
                  {saved ? "Saved" : "Save"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UploadReportDialog({
  open,
  report,
  savingKeys,
  savedKeys,
  errors,
  onOpenChange,
  onSaveMissingSetup,
}: {
  open: boolean
  report: EmployeeUploadReport | null
  savingKeys: Set<string>
  savedKeys: Set<string>
  errors: Record<string, string>
  onOpenChange: (open: boolean) => void
  onSaveMissingSetup: (item: MissingSetupItem) => void
}) {
  const factoryItems = (report?.missing?.factories ?? []).map((value) => ({
    kind: "factory" as const,
    label: "Factory",
    value,
  }))
  const departmentItems = (report?.missing?.departments ?? []).map((value) => ({
    kind: "department" as const,
    label: "Department",
    value,
  }))
  const designationItems = (report?.missing?.designations ?? []).map((value) => ({
    kind: "designation" as const,
    label: "Designation",
    value,
  }))
  const allItems = [...factoryItems, ...departmentItems, ...designationItems]
  const missingTotal = allItems.length
  const allItemsSaved = allItems.length > 0 && allItems.every((item) => savedKeys.has(getMissingSetupKey(item)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee upload report</DialogTitle>
          <DialogDescription>
            The upload was stopped because required setup data is missing. Add the missing records,
            then upload the template again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Inserted</p>
              <p className="mt-1 text-xl font-semibold">{report?.inserted ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Skipped</p>
              <p className="mt-1 text-xl font-semibold">{report?.skipped ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Missing setup</p>
              <p className="mt-1 text-xl font-semibold">{missingTotal}</p>
            </div>
          </div>

          <MissingUploadSetupSection
            title="Factories to add first"
            items={factoryItems}
            savingKeys={savingKeys}
            savedKeys={savedKeys}
            errors={errors}
            onSave={onSaveMissingSetup}
          />
          <MissingUploadSetupSection
            title="Departments to add first"
            items={departmentItems}
            savingKeys={savingKeys}
            savedKeys={savedKeys}
            errors={errors}
            onSave={onSaveMissingSetup}
          />
          <MissingUploadSetupSection
            title="Designations to add first"
            items={designationItems}
            savingKeys={savingKeys}
            savedKeys={savedKeys}
            errors={errors}
            onSave={onSaveMissingSetup}
          />

          {allItemsSaved ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              All missing setup records have been saved. Please upload the employee template again.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Kept temporarily for deleted-section parity review while both employee tables move to buyer-style sections.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EmployeeSectionCard({
  title,
  description,
  employees,
  meta,
  page,
  limit,
  loading,
  error,
  draftFilters,
  onDraftFiltersChange,
  onApplyFilters,
  onRefresh,
  onResetFilters,
  onPageChange,
  onLimitChange,
  factoryOptions,
  designationOptions,
  departmentOptions,
  onEdit,
  onDelete,
  onCreate,
  onOpenAction,
  deleted = false,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
}: {
  title: string
  description: string
  employees: EmployeeRecord[]
  meta: PaginationMeta | null
  page: number
  limit: number
  loading: boolean
  error: string
  draftFilters: EmployeeFilterValues
  onDraftFiltersChange: (filters: EmployeeFilterValues) => void
  onApplyFilters: () => void
  onRefresh: () => void
  onResetFilters: () => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  factoryOptions: LookupOption[]
  designationOptions: LookupOption[]
  departmentOptions: LookupOption[]
  onEdit?: (id: string) => void
  onDelete?: (employee: EmployeeRecord) => void
  onCreate?: () => void
  onOpenAction?: (employee: EmployeeRecord, mode: PendingDeleteMode) => void
  deleted?: boolean
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}) {
  const total = meta?.total ?? employees.length
  const totalPages = meta?.totalPages ?? 1

  return (
    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
      <CardContent className="border-b border-slate-200/70 p-4 sm:p-5 dark:border-white/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              HR payroll master data
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Total {total}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Page {page} of {totalPages}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="rounded-xl"
            >
              <RefreshCcw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>

      <CardContent className="border-b border-slate-200/70 p-4 dark:border-white/10 sm:p-5">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            onApplyFilters()
          }}
        >
          <Input
            value={draftFilters.factoryId}
            onChange={(event) =>
              onDraftFiltersChange({ ...draftFilters, factoryId: event.target.value })
            }
            placeholder="Filter by factory id"
          />
          <Input
            value={draftFilters.employeeCode}
            onChange={(event) =>
              onDraftFiltersChange({ ...draftFilters, employeeCode: event.target.value })
            }
            placeholder="Filter by code"
          />
          <Input
            value={draftFilters.employeeName}
            onChange={(event) =>
              onDraftFiltersChange({ ...draftFilters, employeeName: event.target.value })
            }
            placeholder="Filter by name"
          />
          <Input
            value={draftFilters.gender}
            onChange={(event) => onDraftFiltersChange({ ...draftFilters, gender: event.target.value })}
            placeholder="Filter by gender"
          />
          <Input
            value={draftFilters.designationId}
            onChange={(event) =>
              onDraftFiltersChange({ ...draftFilters, designationId: event.target.value })
            }
            placeholder="Filter by designation id"
          />
          <Input
            value={draftFilters.departmentId}
            onChange={(event) =>
              onDraftFiltersChange({ ...draftFilters, departmentId: event.target.value })
            }
            placeholder="Filter by department id"
          />
          <Input
            value={draftFilters.isActive}
            onChange={(event) =>
              onDraftFiltersChange({ ...draftFilters, isActive: event.target.value })
            }
            placeholder="true / false"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-4">
            <Button type="submit" className="rounded-xl">
              Apply filters
            </Button>
            <Button type="button" variant="outline" onClick={onResetFilters} className="rounded-xl">
              Reset
            </Button>
            {!deleted && canCreate && onCreate ? (
              <Button type="button" onClick={onCreate} className="rounded-xl">
                <Plus className="size-3.5" />
                New employee
              </Button>
            ) : null}
            {deleted ? null : (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Options loaded</span>
              </div>
            )}
          </div>
        </form>
      </CardContent>

      <CardContent className="p-0">
        {loading && employees.length === 0 ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <EmptyState
              title={deleted ? "Unable to load deleted employees" : "Unable to load employees"}
              description={error}
              actionLabel="Try again"
              onAction={onRefresh}
            />
          </div>
        ) : !employees.length ? (
          <div className="p-4">
            <EmptyState
              title={deleted ? "No deleted employees" : "No employees found"}
              description={
                deleted
                  ? "Soft deleted employees will show up here until they are restored or removed permanently."
                  : "Create an employee record to start managing workforce data."
              }
              actionLabel={deleted ? "Refresh" : "New employee"}
              onAction={deleted ? onRefresh : onCreate ?? onRefresh}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1100px] divide-y divide-slate-200/70 dark:divide-white/10">
              <div className="grid grid-cols-[1.1fr_1.2fr_1fr_1fr_1fr_1fr_1.2fr_0.9fr] gap-3 border-b border-slate-200/70 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                <div>Employee</div>
                <div>Assignment</div>
                <div>Contact</div>
                <div>Personal</div>
                <div>Joining</div>
                <div>Address</div>
                <div>Remarks</div>
                <div className="text-right">Actions</div>
              </div>

              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-[1.1fr_1.2fr_1fr_1fr_1fr_1fr_1.2fr_0.9fr] gap-3 px-4 py-4 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {employee.employeeName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {employee.employeeCode}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant={employee.isActive === false ? "outline" : "secondary"} className="rounded-full px-2 py-0.5 text-[10px]">
                        {employee.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p>{employee.factory?.displayName?.trim() || employee.factory?.name || lookupLabel(employee.factoryId, factoryOptions)}</p>
                    <p>{employee.designation?.designationName?.trim() || lookupLabel(employee.designationId || "", designationOptions)}</p>
                    <p>{employee.department?.departmentName?.trim() || lookupLabel(employee.departmentId || "", departmentOptions)}</p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p>{employee.phoneNo || "Not set"}</p>
                    <p className="break-all">{employee.email || "Not set"}</p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p>{genderLabel(employee.gender)}</p>
                    <p>{employee.nidNo || "Not set"}</p>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {formatDate(employee.joiningDate)}
                  </div>

                  <div className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {employee.address || "Not set"}
                  </div>

                  <div className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {employee.remarks || "Not set"}
                  </div>

                  <div className="flex items-start justify-end gap-2">
                    {deleted ? (
                      <>
                        {canUpdate && onOpenAction ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-full"
                            onClick={() => onOpenAction(employee, "restore")}
                            title="Restore"
                          >
                            <Undo2 className="size-3.5" />
                          </Button>
                        ) : null}
                        {canDelete && onOpenAction ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="size-8 rounded-full"
                            onClick={() => onOpenAction(employee, "permanent")}
                            title="Delete permanently"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {canUpdate && onEdit ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-full"
                            onClick={() => onEdit(employee.id)}
                            title="Edit"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                        ) : null}
                        {canDelete && onDelete ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="size-8 rounded-full"
                            onClick={() => onDelete(employee)}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardContent className="border-t border-slate-200/70 p-4 dark:border-white/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {employees.length} records on this page
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(page - 1, 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={Boolean(meta && !meta.hasNextPage)}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
            <select
              value={String(limit)}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className="h-9 rounded-xl border border-input bg-input/20 px-3 text-xs outline-none"
            >
              {[5, 10, 20, 50].map((item) => (
                <option key={item} value={item}>
                  {item} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EmployeeWorkspace({ apiUrl }: { apiUrl: string }) {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingAccessRules, setLoadingAccessRules] = useState(true)
  const [accessRules, setAccessRules] = useState<EmployeeAccessRules | null>(null)
  const [accessError, setAccessError] = useState("")
  const [error, setError] = useState("")
  const [deletedError, setDeletedError] = useState("")
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
    typeof window === "undefined" ? "" : readSelectedOrganizationId(),
  )
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [lookupRefreshVersion, setLookupRefreshVersion] = useState(0)

  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [loadingDeletedEmployees, setLoadingDeletedEmployees] = useState(true)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [deletedEmployees, setDeletedEmployees] = useState<EmployeeRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deletedPage, setDeletedPage] = useState(1)
  const [deletedLimit, setDeletedLimit] = useState(5)

  const [draftFilters, setDraftFilters] = useState<EmployeeFilterValues>(DEFAULT_FILTERS)
  const [activeFilters, setActiveFilters] = useState<EmployeeFilterValues>(DEFAULT_FILTERS)
  const [deletedDraftFilters, setDeletedDraftFilters] = useState<EmployeeFilterValues>(DEFAULT_FILTERS)
  const [deletedFilters, setDeletedFilters] = useState<EmployeeFilterValues>(DEFAULT_FILTERS)

  const [factoryOptions, setFactoryOptions] = useState<LookupOption[]>([])
  const [designationOptions, setDesignationOptions] = useState<LookupOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<LookupOption[]>([])
  const [lookupLoading, setLookupLoading] = useState(true)
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [imageUploading, setImageUploading] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [uploadReport, setUploadReport] = useState<EmployeeUploadReport | null>(null)
  const [uploadReportOpen, setUploadReportOpen] = useState(false)
  const [savingMissingSetupKeys, setSavingMissingSetupKeys] = useState<Set<string>>(() => new Set())
  const [savedMissingSetupKeys, setSavedMissingSetupKeys] = useState<Set<string>>(() => new Set())
  const [missingSetupErrors, setMissingSetupErrors] = useState<Record<string, string>>({})

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EmployeeEditorMode>("create")
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [editorInitialValues, setEditorInitialValues] = useState<EmployeeFormValues>(DEFAULT_FORM_VALUES)
  const [editorFactory, setEditorFactory] = useState<FactoryOption | null>(null)
  const [editorDesignation, setEditorDesignation] = useState<DesignationOption | null>(null)
  const [editorDepartment, setEditorDepartment] = useState<DepartmentOption | null>(null)
  const [editorGender, setEditorGender] = useState<GenderOption | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [recentlyDeletedEmployee, setRecentlyDeletedEmployee] = useState<EmployeeRecord | null>(null)
  const [pendingActionTarget, setPendingActionTarget] = useState<EmployeeRecord | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
  const [pendingActionWorking, setPendingActionWorking] = useState(false)

  const handleAuthFailure = useCallback(
    (message: string) => {
      if (!normalizeAuthFailure(message)) {
        return false
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("access_token")
        window.localStorage.removeItem("refresh_token")
        window.localStorage.removeItem("auth_user")
      }

      router.replace("/sign-in")
      return true
    },
    [router],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    function handleOrganizationChange(event: Event) {
      const nextOrganizationId =
        event instanceof CustomEvent
          ? event.detail?.organizationId
          : readSelectedOrganizationId()

      setSelectedOrganizationId(nextOrganizationId || "")
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)

    return () => {
      window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    }
  }, [])

  const triggerRefresh = useCallback(() => setRefreshVersion((current) => current + 1), [])
  const triggerLookupRefresh = useCallback(() => setLookupRefreshVersion((current) => current + 1), [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadAccessRules() {
      setLoadingAccessRules(true)
      setAccessError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        if (!selectedOrganizationId) {
          if (active) {
            setAccessRules(null)
            setAccessError("Select an organization to manage employee records.")
          }
          return
        }

        const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))

        if (storedUser?.role === "admin") {
          if (active) {
            setAccessRules({
              canView: true,
              canCreate: true,
              canUpdate: true,
              canDelete: true,
            })
          }
          return
        }

        const permission = await fetchCurrentMenuPermission({
          apiUrl,
          accessToken: token,
          organizationId: selectedOrganizationId,
          menuName: MENU_NAME,
        })

        if (!active) {
          return
        }

        setAccessRules({
          canView: permission.canView,
          canCreate: permission.canCreate,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
        })
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your employee menu access right now."

        if (handleAuthFailure(message)) {
          return
        }

        setAccessRules(EMPTY_ACCESS_RULES)
        setAccessError(message)
      } finally {
        if (active) {
          setLoadingAccessRules(false)
        }
      }
    }

    void loadAccessRules()

    return () => {
      active = false
    }
  }, [apiUrl, handleAuthFailure, selectedOrganizationId, refreshVersion])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadLookupOptions() {
      if (!accessRules?.canView || !selectedOrganizationId) {
        if (active) {
          setFactoryOptions([])
          setDesignationOptions([])
          setDepartmentOptions([])
          setLookupLoading(false)
        }
        return
      }

      setLookupLoading(true)

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const loadAll = async <T,>(
          loadPage: (page: number, limit: number) => Promise<{ items: T[]; meta: PaginationMeta }>,
        ) => {
          const items: T[] = []
          let currentPage = 1
          let hasNextPage = true

          while (hasNextPage) {
            const response = await loadPage(currentPage, 100)
            items.push(...response.items)
            hasNextPage = response.meta.hasNextPage
            currentPage += 1
          }

          return items
        }

        const [factoryRecords, designationRecords, departmentRecords] = await Promise.all([
          loadAll((pageNumber, pageLimit) =>
            fetchFactories({
              apiUrl,
              accessToken: token,
              page: pageNumber,
              limit: pageLimit,
              filters: { isActive: "true" },
              organizationId: selectedOrganizationId,
            }),
          ),
          loadAll((pageNumber, pageLimit) =>
            fetchDesignations({
              apiUrl,
              accessToken: token,
              page: pageNumber,
              limit: pageLimit,
              filters: { isActive: "true" },
              organizationId: selectedOrganizationId,
            }),
          ),
          loadAll((pageNumber, pageLimit) =>
            fetchDepartments({
              apiUrl,
              accessToken: token,
              page: pageNumber,
              limit: pageLimit,
              filters: { isActive: "true" },
              organizationId: selectedOrganizationId,
            }),
          ),
        ])

        if (!active) {
          return
        }

        setFactoryOptions(
          factoryRecords
            .filter((factory) => factory.deleted_at == null && factory.isActive !== false)
            .map((factory) => ({
              value: factory.id,
              label: optionLabelFromFactory(factory),
            })),
        )
        setDesignationOptions(
          designationRecords
            .filter((designation) => designation.deleted_at == null && designation.isActive !== false)
            .map((designation) => ({
              value: designation.id,
              label: optionLabelFromDesignation(designation),
            })),
        )
        setDepartmentOptions(
          departmentRecords
            .filter((department) => department.deleted_at == null && department.isActive !== false)
            .map((department) => ({
              value: department.id,
              label: optionLabelFromDepartment(department),
            })),
        )
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load employee lookup data right now."

        if (!handleAuthFailure(message)) {
          toast.error(message)
        }
      } finally {
        if (active) {
          setLookupLoading(false)
        }
      }
    }

    void loadLookupOptions()

    return () => {
      active = false
    }
  }, [accessRules?.canView, apiUrl, handleAuthFailure, lookupRefreshVersion, selectedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let active = true

    async function loadEmployees() {
      if (!accessRules?.canView || !selectedOrganizationId) {
        if (active) {
          setEmployees([])
          setDeletedEmployees([])
          setMeta(null)
          setDeletedMeta(null)
          setError("")
          setDeletedError("")
          setLoadingEmployees(false)
          setLoadingDeletedEmployees(false)
        }
        return
      }

      setLoadingEmployees(true)
      setLoadingDeletedEmployees(true)
      setError("")
      setDeletedError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const [activeResponse, deletedResponse] = await Promise.all([
          fetchEmployees({
            apiUrl,
            accessToken: token,
            page,
            limit,
            filters: activeFilters,
            organizationId: selectedOrganizationId,
          }),
          fetchEmployees({
            apiUrl,
            accessToken: token,
            page: deletedPage,
            limit: deletedLimit,
            filters: deletedFilters,
            deletedOnly: true,
            organizationId: selectedOrganizationId,
          }),
        ])

        if (!active) {
          return
        }

        setEmployees(activeResponse.items)
        setMeta(activeResponse.meta)
        setDeletedEmployees(deletedResponse.items)
        setDeletedMeta(deletedResponse.meta)
      } catch (caughtError) {
        if (!active) {
          return
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load employee data right now."

        if (!handleAuthFailure(message)) {
          setError(message)
          setDeletedError(message)
          toast.error(message)
        }
      } finally {
        if (active) {
          setLoadingEmployees(false)
          setLoadingDeletedEmployees(false)
        }
      }
    }

    void loadEmployees()

    return () => {
      active = false
    }
  }, [
    accessRules?.canView,
    activeFilters,
    apiUrl,
    deletedFilters,
    deletedLimit,
    deletedPage,
    handleAuthFailure,
    limit,
    page,
    refreshVersion,
    selectedOrganizationId,
  ])

  function openCreateDialog() {
    setEditorMode("create")
    setEditorError("")
    setEditingId(null)
    setEditorInitialValues(DEFAULT_FORM_VALUES)
    setEditorFactory(null)
    setEditorDesignation(null)
    setEditorDepartment(null)
    setEditorGender(null)
    setImagePreviewUrl("")
    setImageUploading(false)
    setEditorOpen(true)
  }

  const resetMissingSetupSaveState = useCallback(() => {
    setSavingMissingSetupKeys(new Set())
    setSavedMissingSetupKeys(new Set())
    setMissingSetupErrors({})
  }, [])

  const saveMissingSetupItem = useCallback(
    async (item: MissingSetupItem) => {
      const key = getMissingSetupKey(item)

      if (savingMissingSetupKeys.has(key) || savedMissingSetupKeys.has(key)) {
        return
      }

      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      setSavingMissingSetupKeys((current) => new Set(current).add(key))
      setMissingSetupErrors((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })

      try {
        if (item.kind === "factory") {
          await createFactory({
            apiUrl,
            accessToken: token,
            organizationId: selectedOrganizationId,
            payload: {
              name: item.value,
              displayName: item.value,
              code: "",
              contact: "",
              email: "",
              imageId: "",
              address: "",
              remarks: "",
              isActive: true,
            },
          })
        } else if (item.kind === "department") {
          await createDepartment({
            apiUrl,
            accessToken: token,
            organizationId: selectedOrganizationId,
            payload: {
              departmentName: item.value,
              description: "",
              isActive: true,
            },
          })
        } else {
          await createDesignation({
            apiUrl,
            accessToken: token,
            organizationId: selectedOrganizationId,
            payload: {
              designationName: item.value,
              description: "",
              isActive: true,
            },
          })
        }

        setSavedMissingSetupKeys((current) => new Set(current).add(key))
        toast.success(`${item.label} "${item.value}" saved successfully.`)
        triggerLookupRefresh()
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : `Unable to save ${item.label.toLowerCase()} "${item.value}" right now.`

        if (!handleAuthFailure(message)) {
          setMissingSetupErrors((current) => ({ ...current, [key]: message }))
          toast.error(message)
        }
      } finally {
        setSavingMissingSetupKeys((current) => {
          const next = new Set(current)
          next.delete(key)
          return next
        })
      }
    },
    [
      apiUrl,
      handleAuthFailure,
      savedMissingSetupKeys,
      savingMissingSetupKeys,
      selectedOrganizationId,
      triggerLookupRefresh,
    ],
  )

  async function downloadTemplate() {
    if (!accessRules?.canCreate || downloadingTemplate) {
      if (!accessRules?.canCreate) {
        toast.error("You do not have permission to download the employee template.")
      }
      return
    }

    setDownloadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const blob = await downloadEmployeeUploadTemplate({
        apiUrl,
        accessToken: token,
        organizationId: selectedOrganizationId,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "employee-upload-template.csv"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (caughtError) {
      if (caughtError instanceof EmployeeUploadReportError) {
        resetMissingSetupSaveState()
        setUploadReport(caughtError.report)
        setUploadReportOpen(true)
        toast.warning("Employee upload needs setup data before it can continue.")
        return
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to download the employee template right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file || uploadingTemplate) {
      return
    }

    if (!accessRules?.canCreate) {
      toast.error("You do not have permission to upload employees.")
      return
    }

    setUploadingTemplate(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      const result = await uploadEmployeeTemplate({
        apiUrl,
        accessToken: token,
        file,
        organizationId: selectedOrganizationId,
      })

      if (result.inserted > 0) {
        toast.success(
          `Employee upload completed. ${result.inserted} inserted, ${result.skipped} skipped.`,
        )
      } else {
        toast.warning(buildEmployeeUploadSkippedMessage(result))
      }
      triggerRefresh()
    } catch (caughtError) {
      if (caughtError instanceof EmployeeUploadReportError) {
        resetMissingSetupSaveState()
        setUploadReport(caughtError.report)
        setUploadReportOpen(true)

        if (!handleAuthFailure(caughtError.message)) {
          toast.error(caughtError.message)
        }

        return
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload the employee template right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setUploadingTemplate(false)

      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
  }

  const openEditDialog = useCallback(
    async (id: string) => {
      setEditorMode("edit")
      setEditingId(id)
      setEditorOpen(true)
      setEditorLoading(true)
      setEditorError("")
      setEditorFactory(null)
      setEditorDesignation(null)
      setEditorDepartment(null)
      setEditorGender(null)

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const record = await fetchEmployee({
          apiUrl,
          accessToken: token,
          id,
          organizationId: selectedOrganizationId,
        })

        setEditorInitialValues({
          factoryId: record.factoryId ?? "",
          imageId: record.imageId != null ? String(record.imageId) : "",
          employeeCode: record.employeeCode ?? "",
          employeeName: record.employeeName ?? "",
          designationId: record.designationId ?? "",
          departmentId: record.departmentId ?? "",
          phoneNo: record.phoneNo ?? "",
          email: record.email ?? "",
          gender: record.gender ?? "",
          joiningDate: record.joiningDate ? String(record.joiningDate).slice(0, 10) : "",
          nidNo: record.nidNo ?? "",
          address: record.address ?? "",
          remarks: record.remarks ?? "",
          isActive: record.isActive !== false,
        })
        setEditorFactory(
          record.factory
            ? {
              label: record.factory.displayName?.trim() || record.factory.name?.trim() || "Selected factory",
              value: record.factory.id,
            }
            : factoryOptions.find((factory) => factory.value === record.factoryId) ?? null,
        )
        setEditorDesignation(
          record.designation
            ? {
              label: record.designation.designationName?.trim() || "Selected designation",
              value: record.designation.id,
            }
            : designationOptions.find((designation) => designation.value === record.designationId) ?? null,
        )
        setEditorDepartment(
          record.department
            ? {
              label: record.department.departmentName?.trim() || "Selected department",
              value: record.department.id,
            }
            : departmentOptions.find((department) => department.value === record.departmentId) ?? null,
        )
        setEditorGender(record.gender ? toGenderOption(record.gender) : null)
        setImagePreviewUrl(resolveFilePreviewUrl(record.image))
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the selected employee."

        if (!handleAuthFailure(message)) {
          setEditorError(message)
          toast.error(message)
        }
      } finally {
        setEditorLoading(false)
      }
    },
    [apiUrl, departmentOptions, designationOptions, factoryOptions, handleAuthFailure, selectedOrganizationId],
  )

  const loadFactoryOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<FactoryOption>> => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchFactories({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: {
          name: query,
          isActive: "true",
        },
        organizationId: selectedOrganizationId,
      })

      return {
        items: response.items
          .filter((factory) => factory.deleted_at == null && factory.isActive !== false)
          .map(toFactoryOption),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadDesignationOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<DesignationOption>> => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchDesignations({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: {
          designationName: query,
          isActive: "true",
        },
        organizationId: selectedOrganizationId,
      })

      return {
        items: response.items
          .filter((designation) => designation.deleted_at == null && designation.isActive !== false)
          .map(toDesignationOption),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const loadDepartmentOptions = useCallback(
    async ({ query, page, limit }: AppComboboxLoadParams): Promise<AppComboboxLoadResult<DepartmentOption>> => {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        throw new Error("Your session expired. Please sign in again.")
      }

      const response = await fetchDepartments({
        apiUrl,
        accessToken: token,
        page,
        limit,
        filters: {
          departmentName: query,
          isActive: "true",
        },
        organizationId: selectedOrganizationId,
      })

      return {
        items: response.items
          .filter((department) => department.deleted_at == null && department.isActive !== false)
          .map(toDepartmentOption),
        hasNextPage: response.meta.hasNextPage,
      }
    },
    [apiUrl, handleAuthFailure, selectedOrganizationId],
  )

  const uploadEmployeeImage = useCallback(
    async (file: File | null | undefined) => {
      if (!file) {
        return
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file.")
        return
      }

      setImageUploading(true)

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        const fileRecord = await uploadEmployeeImageFile({
          apiUrl,
          accessToken: token,
          file,
        })

        const uploadedPreviewUrl =
          fileRecord.public_url?.trim() ||
          fileRecord.file_url?.trim() ||
          fileRecord.thumbnail_url?.trim() ||
          ""

        setEditorInitialValues((current) => ({
          ...current,
          imageId: String(fileRecord.file_id),
        }))
        setImagePreviewUrl(uploadedPreviewUrl)

        toast.success(
          `Employee image uploaded successfully. File ID ${fileRecord.file_id} will be saved with the employee.`,
        )
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to upload the employee image right now."

        if (!handleAuthFailure(message)) {
          toast.error(message)
        }
      } finally {
        setImageUploading(false)
      }
    },
    [apiUrl, handleAuthFailure],
  )

  const submitEditor = useCallback(
    async (values: EmployeeFormValues) => {
      if (!values.factoryId.trim()) {
        setEditorError("Factory is required.")
        return
      }

      if (!values.employeeCode.trim()) {
        setEditorError("Employee code is required.")
        return
      }

      if (!values.employeeName.trim()) {
        setEditorError("Employee name is required.")
        return
      }

      setEditorSubmitting(true)
      setEditorError("")

      try {
        const token = window.localStorage.getItem("access_token")

        if (!token) {
          handleAuthFailure("Your session expired. Please sign in again.")
          return
        }

        if (editorMode === "create") {
          await createEmployee({
            apiUrl,
            accessToken: token,
            payload: values,
            organizationId: selectedOrganizationId,
          })
          toast.success("Employee created successfully.")
        } else if (editingId != null) {
          await updateEmployee({
            apiUrl,
            accessToken: token,
            id: editingId,
            payload: values,
            organizationId: selectedOrganizationId,
          })
          toast.success("Employee updated successfully.")
        }

        setEditorOpen(false)
        setEditorInitialValues(DEFAULT_FORM_VALUES)
        setEditorFactory(null)
        setEditorDesignation(null)
        setEditorDepartment(null)
        setEditorGender(null)
        setImagePreviewUrl("")
        setImageUploading(false)
        setEditingId(null)
        triggerRefresh()
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to save the employee right now."

        if (!handleAuthFailure(message)) {
          setEditorError(message)
          toast.error(message)
        }
      } finally {
        setEditorSubmitting(false)
      }
    },
    [apiUrl, editingId, editorMode, handleAuthFailure, selectedOrganizationId, triggerRefresh],
  )

  function resetActiveFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setActiveFilters(DEFAULT_FILTERS)
    setPage(1)
    triggerRefresh()
  }

  async function requestSoftDelete(employee: EmployeeRecord) {
    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete employees.")
      return
    }

    setDeleteTarget(employee)
  }

  async function confirmSoftDelete() {
    if (!deleteTarget || deleteWorking) {
      return
    }

    if (!accessRules?.canDelete) {
      toast.error("You do not have permission to delete employees.")
      return
    }

    setDeleteWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      await softDeleteEmployee({
        apiUrl,
        accessToken: token,
        id: deleteTarget.id,
        organizationId: selectedOrganizationId,
      })

      setRecentlyDeletedEmployee(deleteTarget)
      setDeleteTarget(null)
      toast.success("Employee moved to recently deleted.")
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the employee right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setDeleteWorking(false)
    }
  }

  function openPendingActionDialog(employee: EmployeeRecord, action: PendingDeleteMode) {
    setPendingActionTarget(employee)
    setPendingActionMode(action)
  }

  async function confirmPendingAction() {
    if (!pendingActionTarget || !pendingActionMode || pendingActionWorking) {
      return
    }

    setPendingActionWorking(true)

    try {
      const token = window.localStorage.getItem("access_token")

      if (!token) {
        handleAuthFailure("Your session expired. Please sign in again.")
        return
      }

      if (pendingActionMode === "restore") {
        if (!accessRules?.canUpdate) {
          toast.error("You do not have permission to restore employees.")
          return
        }

        await restoreEmployee({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId,
        })
        toast.success("Employee restored successfully.")
      } else {
        if (!accessRules?.canDelete) {
          toast.error("You do not have permission to permanently delete employees.")
          return
        }

        await permanentlyDeleteEmployee({
          apiUrl,
          accessToken: token,
          id: pendingActionTarget.id,
          organizationId: selectedOrganizationId,
        })
        toast.success("Employee deleted permanently.")
      }

      if (recentlyDeletedEmployee?.id === pendingActionTarget.id) {
        setRecentlyDeletedEmployee(null)
      }

      setPendingActionTarget(null)
      setPendingActionMode(null)
      triggerRefresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to complete the delete action right now."

      if (!handleAuthFailure(message)) {
        toast.error(message)
      }
    } finally {
      setPendingActionWorking(false)
    }
  }

  const activeTotal = meta?.total ?? employees.length
  const deletedTotal = deletedMeta?.total ?? deletedEmployees.length
  const activeCount = useMemo(
    () => employees.filter((employee) => employee.deleted_at == null && employee.isActive !== false).length,
    [employees],
  )

  const employeeAccessMissing = !loadingAccessRules && accessRules && !accessRules.canView

  if (
    (loadingAccessRules || loadingEmployees) &&
    employees.length === 0 &&
    (loadingAccessRules || loadingDeletedEmployees) &&
    deletedEmployees.length === 0 &&
    !error &&
    !deletedError &&
    !accessError &&
    !lookupLoading
  ) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <LoadingCard />
            <LoadingCard />
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (employeeAccessMissing) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Hr-Payroll
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Employee</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage employee master data for the selected organization.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>

        <EmptyState
          title="Employee access unavailable"
          description={accessError || "You do not have permission to view the Employee menu for the selected organization."}
          actionLabel="Retry"
          onAction={triggerRefresh}
        />
      </div>
    )
  }

  if (error && employees.length === 0 && deletedEmployees.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Hr-Payroll
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Employee</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Manage employee master data for the selected organization.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>

        <EmptyState
          title="Unable to load employees"
          description={error}
          actionLabel="Try again"
          onAction={triggerRefresh}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
            <CardContent className="p-4 sm:p-8 sm:py-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Hr-Payroll master data
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Employee
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Create, review, and maintain employee records for the selected organization.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Total {activeTotal}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Active {activeCount}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Deleted {deletedTotal}
                    </Badge>
                    {recentlyDeletedEmployee ? (
                      <Badge variant="destructive" className="rounded-full px-3 py-1">
                        Recently deleted
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerRefresh}
                    className="rounded-xl"
                  >
                    <RefreshCcw className="size-3.5" />
                    Refresh
                  </Button>
                  {accessRules?.canCreate ? (
                    <Button type="button" onClick={openCreateDialog} className="rounded-xl">
                      <Plus className="size-3.5" />
                      New employee
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentlyDeletedEmployee ? (
            <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                      Recently deleted employee
                    </p>
                    <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                      {getEmployeeLabel(recentlyDeletedEmployee)} was soft deleted and can still be
                      restored.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessRules?.canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                        onClick={() => openPendingActionDialog(recentlyDeletedEmployee, "restore")}
                      >
                        <Undo2 className="size-3.5" />
                        Restore
                      </Button>
                    ) : null}
                    {accessRules?.canDelete ? (
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => openPendingActionDialog(recentlyDeletedEmployee, "permanent")}
                      >
                        <Trash2 className="size-3.5" />
                        Delete permanently
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {lookupLoading ? <LoadingCard /> : null}

          <ActiveEmployeesSection
            employees={employees}
            meta={meta}
            page={page}
            limit={limit}
            loadingEmployees={loadingEmployees}
            draftFilters={draftFilters}
            activeFilters={activeFilters}
            onDraftFiltersChange={setDraftFilters}
            onActiveFiltersChange={setActiveFilters}
            onResetFilters={resetActiveFilters}
            onPageChange={setPage}
            onLimitChange={setLimit}
            factoryOptions={factoryOptions}
            designationOptions={designationOptions}
            departmentOptions={departmentOptions}
            onCreateEmployee={openCreateDialog}
            onEditEmployee={openEditDialog}
            onDeleteEmployee={requestSoftDelete}
            onDownloadTemplate={downloadTemplate}
            onUploadTemplate={() => uploadInputRef.current?.click()}
            canCreateEmployee={Boolean(accessRules?.canCreate)}
            canUpdateEmployee={Boolean(accessRules?.canUpdate)}
            canDeleteEmployee={Boolean(accessRules?.canDelete)}
            downloadingTemplate={downloadingTemplate}
            uploadingTemplate={uploadingTemplate}
          />

          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => void uploadTemplate(event.target.files?.[0])}
          />

          <DeletedEmployeesSection
            deletedEmployees={deletedEmployees}
            deletedMeta={deletedMeta}
            deletedPage={deletedPage}
            deletedLimit={deletedLimit}
            loadingDeletedEmployees={loadingDeletedEmployees}
            deletedError={deletedError}
            deletedDraftFilters={deletedDraftFilters}
            deletedActiveFilters={deletedFilters}
            onDeletedDraftFiltersChange={setDeletedDraftFilters}
            onDeletedActiveFiltersChange={setDeletedFilters}
            onDeletedPageChange={setDeletedPage}
            onDeletedLimitChange={setDeletedLimit}
            factoryOptions={factoryOptions}
            designationOptions={designationOptions}
            departmentOptions={departmentOptions}
            onOpenAction={openPendingActionDialog}
            canRestoreEmployee={Boolean(accessRules?.canUpdate)}
            canPermanentlyDeleteEmployee={Boolean(accessRules?.canDelete)}
          />
        </div>
      </ScrollArea>

      <EmployeeFormDialog
        key={`${editorMode}-${editorOpen ? "open" : "closed"}-${editorFactory?.value ?? "none"}-${editorDesignation?.value ?? "none"}-${editorDepartment?.value ?? "none"}-${editorGender?.value ?? "none"}-${editorInitialValues.imageId}-${editorInitialValues.employeeCode}-${editorInitialValues.employeeName}`}
        open={editorOpen}
        mode={editorMode}
        loading={editorLoading}
        submitting={editorSubmitting}
        error={editorError}
        initialFactory={editorFactory}
        loadFactoryOptions={loadFactoryOptions}
        initialDesignation={editorDesignation}
        loadDesignationOptions={loadDesignationOptions}
        initialDepartment={editorDepartment}
        loadDepartmentOptions={loadDepartmentOptions}
        initialGender={editorGender}
        initialValues={editorInitialValues}
        onOpenChange={(open) => {
          setEditorOpen(open)

          if (!open) {
            setEditorInitialValues(DEFAULT_FORM_VALUES)
            setEditorFactory(null)
            setEditorDesignation(null)
            setEditorDepartment(null)
            setEditorGender(null)
            setEditorError("")
            setEditorLoading(false)
            setEditorSubmitting(false)
            setImagePreviewUrl("")
            setImageUploading(false)
            setEditingId(null)
          }
        }}
        imagePreviewUrl={imagePreviewUrl}
        imageUploading={imageUploading}
        onImageUpload={uploadEmployeeImage}
        onSubmit={submitEditor}
      />

      <UploadReportDialog
        open={uploadReportOpen}
        report={uploadReport}
        savingKeys={savingMissingSetupKeys}
        savedKeys={savedMissingSetupKeys}
        errors={missingSetupErrors}
        onSaveMissingSetup={saveMissingSetupItem}
        onOpenChange={(open) => {
          setUploadReportOpen(open)

          if (!open) {
            setUploadReport(null)
            resetMissingSetupSaveState()
          }
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        employee={deleteTarget}
        working={deleteWorking}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={confirmSoftDelete}
      />

      <RecentlyDeletedDialog
        open={Boolean(pendingActionTarget && pendingActionMode)}
        action={pendingActionMode ?? "restore"}
        employee={pendingActionTarget}
        working={pendingActionWorking}
        onOpenChange={(open) => {
          if (!open) {
            setPendingActionTarget(null)
            setPendingActionMode(null)
          }
        }}
        onConfirm={confirmPendingAction}
      />
    </div>
  )
}
