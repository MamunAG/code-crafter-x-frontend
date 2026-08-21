"use client"

import { useRef, useState, type ReactNode } from "react"
import { Loader2, Upload } from "lucide-react"

import {
  AppCombobox,
  type AppComboboxLoadParams,
  type AppComboboxLoadResult,
  type AppComboboxOption,
} from "@/components/app-combobox"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { EmployeeFormValues } from "../employee.types"
import { EmployeeExtendedProfileSections } from "./employee-extended-profile-sections"

type FactoryOption = AppComboboxOption
type DesignationOption = AppComboboxOption
type DepartmentOption = AppComboboxOption
type GenderOption = AppComboboxOption

type EmployeeFormDialogProps = {
  open: boolean
  loading: boolean
  submitting: boolean
  error: string
  mode: "create" | "edit"
  initialValues: EmployeeFormValues
  setupOptions: {
    employmentTypes: Array<{ value: string; label: string }>
    grades: Array<{ value: string; label: string }>
    payGroups: Array<{ value: string; label: string }>
    workLocations: Array<{ value: string; label: string }>
  }
  initialFactory: FactoryOption | null
  loadFactoryOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<FactoryOption>>
  initialDesignation: DesignationOption | null
  loadDesignationOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<DesignationOption>>
  initialDepartment: DepartmentOption | null
  loadDepartmentOptions: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<DepartmentOption>>
  initialGender: GenderOption | null
  imagePreviewUrl: string
  imageUploading: boolean
  onOpenChange: (open: boolean) => void
  onImageUpload: (file: File | null | undefined) => void
  onSubmit: (values: EmployeeFormValues) => void
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="text-sm font-medium">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  )
}

const GENDER_OPTIONS: GenderOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
]

const COMBOBOX_CONTENT_CLASS =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]"

function ComboboxHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
      <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function EmployeeFormDialog({
  open,
  loading,
  submitting,
  error,
  mode,
  initialValues,
  setupOptions,
  initialFactory,
  loadFactoryOptions,
  initialDesignation,
  loadDesignationOptions,
  initialDepartment,
  loadDepartmentOptions,
  initialGender,
  imagePreviewUrl,
  imageUploading,
  onOpenChange,
  onImageUpload,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [draft, setDraft] = useState(initialValues)
  const [factoryComboboxOpen, setFactoryComboboxOpen] = useState(false)
  const [selectedFactory, setSelectedFactory] = useState<FactoryOption | null>(initialFactory)
  const [designationComboboxOpen, setDesignationComboboxOpen] = useState(false)
  const [selectedDesignation, setSelectedDesignation] = useState<DesignationOption | null>(initialDesignation)
  const [departmentComboboxOpen, setDepartmentComboboxOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(initialDepartment)
  const [genderComboboxOpen, setGenderComboboxOpen] = useState(false)
  const [selectedGender, setSelectedGender] = useState<GenderOption | null>(initialGender)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const title = mode === "create" ? "Create employee" : "Edit employee"
  const description =
    mode === "create"
      ? "Add an employee record for the selected organization."
      : "Update the selected employee record."

  function update<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <form
          className="flex h-full min-h-0 min-w-0 flex-col sm:max-h-[calc(100dvh-2rem)]"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(draft)
          }}
        >
          <div className="shrink-0 border-b border-slate-200/70 px-4 pb-4 pt-5 pr-12 dark:border-white/10 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-12">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {!loading && error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            <div className="w-full min-w-0 max-w-full space-y-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                <FieldLabel>Employee image</FieldLabel>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
                  <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4 md:grid-cols-[11rem_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
                      {imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="Uploaded employee preview"
                          className="h-20 w-full object-contain p-2 sm:h-28 md:h-32"
                        />
                      ) : (
                        <div className="flex h-20 flex-col items-center justify-center gap-2 px-2 text-center text-xs text-slate-500 dark:text-slate-400 sm:h-28 md:h-32">
                          <Upload className="size-5" />
                          No image uploaded
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={loading || submitting || imageUploading}
                        className="w-full rounded-xl sm:w-auto"
                      >
                        {imageUploading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        {imageUploading ? "Uploading image..." : "Upload image"}
                      </Button>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        The uploaded file id will be saved as imageId.
                      </p>
                    </div>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void onImageUpload(event.currentTarget.files?.[0])
                        event.currentTarget.value = ""
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="employee-factory-combobox" className="text-sm font-medium">
                    Factory <span className="text-destructive">*</span>
                  </label>
                  <AppCombobox
                    open={factoryComboboxOpen}
                    onOpenChange={setFactoryComboboxOpen}
                    value={selectedFactory}
                    onValueChange={(factory) => {
                      setSelectedFactory(factory)
                      update("factoryId", factory?.value ?? "")
                      setFactoryComboboxOpen(false)
                    }}
                    loadItems={loadFactoryOptions}
                    initialLimit={10}
                    searchLimit={10}
                    inputProps={{
                      id: "employee-factory-combobox",
                    }}
                    placeholder="Search factory"
                    loadingMessage="Loading factories..."
                    emptyMessage="No factories match your search."
                    showClear={Boolean(draft.factoryId)}
                    disabled={loading || submitting}
                    contentClassName={COMBOBOX_CONTENT_CLASS}
                    header={
                      <ComboboxHeader
                        title="Factory"
                        description="Search and select the employee factory."
                      />
                    }
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel required>Employee code</FieldLabel>
                  <Input
                    value={draft.employeeCode}
                    onChange={(event) => update("employeeCode", event.target.value)}
                    placeholder="EMP-001"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel required>Employee name</FieldLabel>
                <Input
                  value={draft.employeeName}
                  readOnly
                  aria-readonly="true"
                  placeholder="Generated from first, middle, and last name"
                  className="cursor-default bg-muted/50"
                  disabled={loading || submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Automatically generated from the name fields in the Personal section below.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="employee-designation-combobox" className="text-sm font-medium">
                    Designation
                  </label>
                  <AppCombobox
                    open={designationComboboxOpen}
                    onOpenChange={setDesignationComboboxOpen}
                    value={selectedDesignation}
                    onValueChange={(designation) => {
                      setSelectedDesignation(designation)
                      update("designationId", designation?.value ?? "")
                      setDesignationComboboxOpen(false)
                    }}
                    loadItems={loadDesignationOptions}
                    initialLimit={10}
                    searchLimit={10}
                    inputProps={{
                      id: "employee-designation-combobox",
                    }}
                    placeholder="Search designation"
                    loadingMessage="Loading designations..."
                    emptyMessage="No designations match your search."
                    showClear={Boolean(draft.designationId)}
                    disabled={loading || submitting}
                    contentClassName={COMBOBOX_CONTENT_CLASS}
                    header={
                      <ComboboxHeader
                        title="Designation"
                        description="Search and select the employee designation."
                      />
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="employee-department-combobox" className="text-sm font-medium">
                    Department
                  </label>
                  <AppCombobox
                    open={departmentComboboxOpen}
                    onOpenChange={setDepartmentComboboxOpen}
                    value={selectedDepartment}
                    onValueChange={(department) => {
                      setSelectedDepartment(department)
                      update("departmentId", department?.value ?? "")
                      setDepartmentComboboxOpen(false)
                    }}
                    loadItems={loadDepartmentOptions}
                    initialLimit={10}
                    searchLimit={10}
                    inputProps={{
                      id: "employee-department-combobox",
                    }}
                    placeholder="Search department"
                    loadingMessage="Loading departments..."
                    emptyMessage="No departments match your search."
                    showClear={Boolean(draft.departmentId)}
                    disabled={loading || submitting}
                    contentClassName={COMBOBOX_CONTENT_CLASS}
                    header={
                      <ComboboxHeader
                        title="Department"
                        description="Search and select the employee department."
                      />
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Phone number</FieldLabel>
                  <Input
                    value={draft.phoneNo}
                    onChange={(event) => update("phoneNo", event.target.value)}
                    placeholder="+8801700000000"
                    disabled={loading || submitting}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    value={draft.email}
                    onChange={(event) => update("email", event.target.value)}
                    type="email"
                    placeholder="employee@example.com"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="employee-gender-combobox" className="text-sm font-medium">
                    Gender
                  </label>
                  <AppCombobox
                    open={genderComboboxOpen}
                    onOpenChange={setGenderComboboxOpen}
                    items={GENDER_OPTIONS}
                    value={selectedGender}
                    onValueChange={(gender) => {
                      setSelectedGender(gender)
                      update("gender", gender?.value ?? "")
                      setGenderComboboxOpen(false)
                    }}
                    inputProps={{
                      id: "employee-gender-combobox",
                    }}
                    placeholder="Search gender"
                    emptyMessage="No genders match your search."
                    showClear={Boolean(draft.gender)}
                    disabled={loading || submitting}
                    contentClassName={COMBOBOX_CONTENT_CLASS}
                    header={
                      <ComboboxHeader
                        title="Gender"
                        description="Search and select the employee gender."
                      />
                    }
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Joining date</FieldLabel>
                  <Input
                    value={draft.joiningDate}
                    onChange={(event) => update("joiningDate", event.target.value)}
                    type="date"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>NID / ID card</FieldLabel>
                  <Input
                    value={draft.nidNo}
                    onChange={(event) => update("nidNo", event.target.value)}
                    placeholder="1234567890"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Address</FieldLabel>
                <Textarea
                  value={draft.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Input employee address"
                  rows={3}
                  disabled={loading || submitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Remarks</FieldLabel>
                <Textarea
                  value={draft.remarks}
                  onChange={(event) => update("remarks", event.target.value)}
                  placeholder="Optional remarks"
                  rows={3}
                  disabled={loading || submitting}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel>Active</FieldLabel>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Active employees can be selected in downstream HR workflows.
                    </p>
                  </div>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(checked) => update("isActive", checked)}
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <EmployeeExtendedProfileSections
                value={draft}
                setupOptions={setupOptions}
                disabled={loading || submitting}
                onChange={setDraft}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200/70 px-4 py-3 dark:border-white/10 sm:px-6 sm:py-4">
            <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || submitting}
                className="w-full rounded-xl sm:w-auto"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save employee" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
