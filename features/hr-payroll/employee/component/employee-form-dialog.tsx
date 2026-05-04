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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { EmployeeFormValues } from "../employee.types"

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
      <DialogContent className="overflow-hidden p-0 sm:max-w-4xl">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(draft)
          }}
        >
          <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
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

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <FieldLabel>Employee image</FieldLabel>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)] md:items-center">
                    <div className="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
                      {imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="Uploaded employee preview"
                          className="h-32 w-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-32 flex-col items-center justify-center gap-2 px-3 text-center text-xs text-slate-500 dark:text-slate-400">
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
                        className="rounded-xl"
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
                  onChange={(event) => update("employeeName", event.target.value)}
                  placeholder="Input employee name"
                  disabled={loading || submitting}
                />
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
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
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
