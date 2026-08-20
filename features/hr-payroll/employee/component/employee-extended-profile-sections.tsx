"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppSelect } from "@/components/app-select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { EmployeeFormValues, EmployeeProfileData } from "../employee.types"

type Props = {
  value: EmployeeFormValues
  setupOptions: {
    employmentTypes: Array<{ value: string; label: string }>
    grades: Array<{ value: string; label: string }>
    payGroups: Array<{ value: string; label: string }>
    workLocations: Array<{ value: string; label: string }>
  }
  disabled: boolean
  onChange: (value: EmployeeFormValues) => void
}

type Field = {
  key: string
  label: string
  type?: "text" | "date" | "number" | "email" | "textarea" | "boolean"
  placeholder?: string
}

type CollectionKey =
  | "emergencyContacts"
  | "educationRecords"
  | "professionalQualifications"
  | "previousEmployment"
  | "languages"
  | "nominees"
  | "familyMembers"

const TABS = [
  ["personal", "Personal"],
  ["official", "Official"],
  ["rules", "Rules & bank"],
  ["custom", "Custom"],
  ["emergencyContacts", "Emergency"],
  ["educationRecords", "Education"],
  ["professionalQualifications", "Qualifications"],
  ["previousEmployment", "Employment history"],
  ["languages", "Languages"],
  ["nominees", "Nominees"],
  ["familyMembers", "Family"],
] as const

const COLLECTIONS: Record<CollectionKey, { title: string; fields: Field[] }> = {
  emergencyContacts: {
    title: "Emergency contact",
    fields: [
      { key: "name", label: "Contact name" },
      { key: "relationship", label: "Relationship" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email", type: "email" },
      { key: "address", label: "Address", type: "textarea" },
    ],
  },
  educationRecords: {
    title: "Education record",
    fields: [
      { key: "instituteName", label: "Institute name" },
      { key: "examName", label: "Exam / degree" },
      { key: "board", label: "Board / university" },
      { key: "examYear", label: "Passing year", type: "number" },
      { key: "group", label: "Group / major" },
      { key: "certificateNo", label: "Certificate number" },
      { key: "result", label: "Result / CGPA" },
      { key: "division", label: "Division" },
    ],
  },
  professionalQualifications: {
    title: "Professional qualification",
    fields: [
      { key: "qualification", label: "Qualification" },
      { key: "institute", label: "Institute" },
      { key: "country", label: "Country" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
      { key: "certificateNo", label: "Certificate number" },
    ],
  },
  previousEmployment: {
    title: "Previous employment",
    fields: [
      { key: "companyName", label: "Company name" },
      { key: "designation", label: "Designation" },
      { key: "country", label: "Country" },
      { key: "city", label: "City" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "phone", label: "Phone" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
      { key: "startSalary", label: "Starting salary", type: "number" },
      { key: "endSalary", label: "Ending salary", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "resignCause", label: "Reason for leaving" },
      { key: "responsibilities", label: "Responsibilities", type: "textarea" },
    ],
  },
  languages: {
    title: "Language proficiency",
    fields: [
      { key: "language", label: "Language" },
      { key: "writing", label: "Writing level" },
      { key: "reading", label: "Reading level" },
      { key: "spoken", label: "Spoken level" },
      { key: "motherLanguage", label: "Mother language", type: "boolean" },
    ],
  },
  nominees: {
    title: "Nominee",
    fields: [
      { key: "nomineeType", label: "Nominee type", placeholder: "PF, insurance, medical or gratuity" },
      { key: "name", label: "Nominee name" },
      { key: "relationship", label: "Relationship" },
      { key: "dateOfBirth", label: "Date of birth", type: "date" },
      { key: "fatherName", label: "Father name" },
      { key: "motherName", label: "Mother name" },
      { key: "nidNo", label: "NID number" },
      { key: "phone", label: "Mobile number" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "distribution", label: "Distribution %", type: "number" },
    ],
  },
  familyMembers: {
    title: "Family member",
    fields: [
      { key: "name", label: "Member name" },
      { key: "relationship", label: "Relationship" },
      { key: "dateOfBirth", label: "Date of birth", type: "date" },
      { key: "occupation", label: "Occupation" },
      { key: "workStation", label: "Work station" },
      { key: "monthlyIncome", label: "Monthly income", type: "number" },
    ],
  },
}

function FormField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Field
  value: unknown
  disabled: boolean
  onChange: (value: unknown) => void
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex min-h-10 items-center justify-between gap-3 rounded-xl border px-3">
        <span className="text-sm font-medium">{field.label}</span>
        <Switch checked={value === true} onCheckedChange={onChange} disabled={disabled} />
      </label>
    )
  }

  return (
    <label className={cn("space-y-1.5", field.type === "textarea" && "md:col-span-2")}>
      <span className="text-sm font-medium">{field.label}</span>
      {field.type === "textarea" ? (
        <Textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={2}
        />
      ) : (
        <Input
          type={field.type ?? "text"}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) =>
            onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
          }
          disabled={disabled}
        />
      )}
    </label>
  )
}

function CollectionEditor({
  collectionKey,
  records,
  disabled,
  onChange,
}: {
  collectionKey: CollectionKey
  records: Array<Record<string, unknown>>
  disabled: boolean
  onChange: (records: Array<Record<string, unknown>>) => void
}) {
  const config = COLLECTIONS[collectionKey]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold">{config.title}</h4>
          <p className="text-xs text-muted-foreground">Add as many records as required.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...records, {}])}
        >
          <Plus /> Add record
        </Button>
      </div>
      {records.length ? (
        records.map((record, index) => (
          <div key={index} className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {config.title} {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={`Remove ${config.title} ${index + 1}`}
                onClick={() => onChange(records.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {config.fields.map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={record[field.key]}
                  disabled={disabled}
                  onChange={(nextValue) =>
                    onChange(
                      records.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, [field.key]: nextValue } : item,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No {config.title.toLowerCase()} records added.
        </div>
      )}
    </div>
  )
}

export function EmployeeExtendedProfileSections({ value, setupOptions, disabled, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number][0]>("personal")
  const profile: EmployeeProfileData = value.profile ?? {}

  const updateProfile = (nextProfile: EmployeeProfileData) =>
    onChange({ ...value, profile: nextProfile })
  const updateSection = (
    section: "general" | "official" | "rules" | "custom",
    key: string,
    nextValue: unknown,
  ) =>
    updateProfile({
      ...profile,
      [section]: { ...(profile[section] ?? {}), [key]: nextValue },
    })

  const personalFields: Field[] = [
    { key: "salutation", label: "Salutation" },
    { key: "firstName", label: "First name" },
    { key: "middleName", label: "Middle name" },
    { key: "lastName", label: "Last name" },
    { key: "nickName", label: "Nick name" },
    { key: "displayCode", label: "Display code" },
    { key: "punchCardNo", label: "Punch card number" },
    { key: "employeeOrigin", label: "Employee origin", placeholder: "Local or expatriate" },
    { key: "religion", label: "Religion" },
    { key: "nationality", label: "Nationality" },
    { key: "bloodGroup", label: "Blood group" },
    { key: "alternatePhone", label: "Alternate phone" },
    { key: "presentPoliceStation", label: "Present address: police station" },
    { key: "presentPostalCode", label: "Present address: postal code" },
    { key: "presentCountry", label: "Present address: country" },
    { key: "presentDistrict", label: "Present address: district" },
    { key: "permanentAddress", label: "Permanent address", type: "textarea" },
    { key: "permanentPoliceStation", label: "Permanent address: police station" },
    { key: "permanentPostalCode", label: "Permanent address: postal code" },
    { key: "permanentCountry", label: "Permanent address: country" },
    { key: "permanentDistrict", label: "Permanent address: district" },
    { key: "permanentAddressSameAsPresent", label: "Permanent address same as present", type: "boolean" },
    { key: "spouseName", label: "Spouse name" },
    { key: "spouseOccupation", label: "Spouse occupation" },
    { key: "numberOfChildren", label: "Number of children", type: "number" },
    { key: "referenceAddress", label: "Reference address", type: "textarea" },
  ]
  const officialFields: Field[] = [
    { key: "positionName", label: "Position name" },
    { key: "unit", label: "Unit" },
    { key: "division", label: "Division" },
    { key: "section", label: "Section" },
    { key: "subSection", label: "Sub-section" },
    { key: "staffCategory", label: "Staff category" },
    { key: "jobLocation", label: "Job location" },
    { key: "operation", label: "Operation" },
    { key: "costCenter", label: "Cost center" },
    { key: "reportingManagerFunctionalId", label: "Functional reporting employee ID" },
    { key: "reportingManagerAdminId", label: "Administrative reporting employee ID" },
    { key: "overtimeEligible", label: "Overtime eligible", type: "boolean" },
    { key: "offDayOvertimeEligible", label: "Off-day overtime eligible", type: "boolean" },
    { key: "providentFundEligible", label: "Provident fund eligible", type: "boolean" },
    { key: "holidayBonusEligible", label: "Holiday bonus eligible", type: "boolean" },
    { key: "insuranceEligible", label: "Insurance eligible", type: "boolean" },
    { key: "specialMedicalNote", label: "Special medical note", type: "textarea" },
    { key: "separationCause", label: "Separation cause" },
    { key: "separationNotes", label: "Separation notes", type: "textarea" },
  ]
  const ruleFields: Field[] = [
    { key: "leavePolicyId", label: "Leave policy ID" },
    { key: "attendanceRule", label: "Attendance rule" },
    { key: "paymentPolicy", label: "Payment policy" },
    { key: "currencyRule", label: "Currency rule" },
    { key: "shiftRule", label: "Shift rule" },
    { key: "defaultWorkOff", label: "Default work off" },
    { key: "bankName", label: "Bank name" },
    { key: "bankAccountNo", label: "Bank account number" },
    { key: "bankBranchName", label: "Bank branch" },
  ]
  const coreOfficialFields: Array<{ key: keyof EmployeeFormValues; label: string; type?: string }> = [
    { key: "employmentTypeId", label: "Employment type ID" },
    { key: "gradeId", label: "Grade ID" },
    { key: "payGroupId", label: "Pay group ID" },
    { key: "workLocationId", label: "Work location ID" },
    { key: "supervisorId", label: "Supervisor employee ID" },
    { key: "confirmationDate", label: "Confirmation date", type: "date" },
    { key: "probationEndDate", label: "Probation end date", type: "date" },
    { key: "contractEndDate", label: "Contract end date", type: "date" },
    { key: "separationDate", label: "Separation date", type: "date" },
  ]

  const collectionKey = activeTab in COLLECTIONS ? (activeTab as CollectionKey) : null

  return (
    <section className="space-y-4 rounded-2xl border p-4">
      <div>
        <h3 className="font-semibold">Extended employee profile</h3>
        <p className="text-xs text-muted-foreground">
          Personal, official, rule, qualification, nominee, and family information.
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b pb-2">
        {TABS.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={activeTab === key ? "secondary" : "ghost"}
            className="shrink-0"
            onClick={() => setActiveTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "personal" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField field={{ key: "dateOfBirth", label: "Date of birth", type: "date" }} value={value.dateOfBirth} disabled={disabled} onChange={(next) => onChange({ ...value, dateOfBirth: String(next) })} />
            <FormField field={{ key: "maritalStatus", label: "Marital status" }} value={value.maritalStatus} disabled={disabled} onChange={(next) => onChange({ ...value, maritalStatus: String(next) })} />
            <FormField field={{ key: "taxIdentifier", label: "TIN / tax identifier" }} value={value.taxIdentifier} disabled={disabled} onChange={(next) => onChange({ ...value, taxIdentifier: String(next) })} />
            {personalFields.map((field) => <FormField key={field.key} field={field} value={profile.general?.[field.key]} disabled={disabled} onChange={(next) => updateSection("general", field.key, next)} />)}
          </div>
        </div>
      ) : null}

      {activeTab === "official" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["employmentTypeId", "Employment type", setupOptions.employmentTypes],
            ["gradeId", "Grade", setupOptions.grades],
            ["payGroupId", "Pay group", setupOptions.payGroups],
            ["workLocationId", "Work location", setupOptions.workLocations],
          ] as const).map(([key, label, options]) => (
            <label key={key} className="space-y-1.5">
              <span className="text-sm font-medium">{label}</span>
              <AppSelect value={String(value[key] ?? "")} onValueChange={(next) => onChange({ ...value, [key]: next })} options={options} placeholder={`Select ${label.toLowerCase()}`} disabled={disabled} triggerClassName="h-10 rounded-xl px-3 text-sm" />
            </label>
          ))}
          {coreOfficialFields.filter((field) => !["employmentTypeId", "gradeId", "payGroupId", "workLocationId"].includes(String(field.key))).map((field) => <FormField key={String(field.key)} field={{ key: String(field.key), label: field.label, type: field.type as Field["type"] }} value={value[field.key]} disabled={disabled} onChange={(next) => onChange({ ...value, [field.key]: String(next) })} />)}
          <FormField field={{ key: "employmentStatus", label: "Employment status" }} value={value.employmentStatus} disabled={disabled} onChange={(next) => onChange({ ...value, employmentStatus: String(next) })} />
          {officialFields.map((field) => <FormField key={field.key} field={field} value={profile.official?.[field.key]} disabled={disabled} onChange={(next) => updateSection("official", field.key, next)} />)}
        </div>
      ) : null}

      {activeTab === "rules" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField field={{ key: "taxStatus", label: "Tax status" }} value={value.taxStatus} disabled={disabled} onChange={(next) => onChange({ ...value, taxStatus: String(next) })} />
          <FormField field={{ key: "bankDetails", label: "Additional bank details", type: "textarea" }} value={value.bankDetails} disabled={disabled} onChange={(next) => onChange({ ...value, bankDetails: String(next) })} />
          {ruleFields.map((field) => <FormField key={field.key} field={field} value={profile.rules?.[field.key]} disabled={disabled} onChange={(next) => updateSection("rules", field.key, next)} />)}
        </div>
      ) : null}

      {activeTab === "custom" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {["gradeInfo", "line", "floor", "jobType", "deviceCategory", "gazetteStatus", "birthRegistrationNo", "tinNo"].map((key) => <FormField key={key} field={{ key, label: key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()) }} value={profile.custom?.[key]} disabled={disabled} onChange={(next) => updateSection("custom", key, String(next))} />)}
        </div>
      ) : null}

      {collectionKey ? (
        <CollectionEditor
          collectionKey={collectionKey}
          records={(profile[collectionKey] ?? []) as Array<Record<string, unknown>>}
          disabled={disabled}
          onChange={(records) => updateProfile({ ...profile, [collectionKey]: records })}
        />
      ) : null}
    </section>
  )
}
