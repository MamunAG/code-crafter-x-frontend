"use client"

import { useEffect, useRef, useState } from "react"

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

import { MATERIAL_IMAGE_MAX_SIZE_LABEL } from "../material.constants"
import type { MaterialFormValues } from "../material.types"

type MaterialEditorMode = "create" | "edit"

type MaterialFormDialogProps = {
  open: boolean
  loading: boolean
  submitting: boolean
  error: string
  mode: MaterialEditorMode
  initialValues: MaterialFormValues
  unitOptions: AppComboboxOption[]
  materialGroupOptions: AppComboboxOption[]
  imagePreviewUrl: string
  imageUploading: boolean
  loadUnitOptions: (
    params: AppComboboxLoadParams
  ) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  loadMaterialGroupOptions: (
    params: AppComboboxLoadParams
  ) => Promise<AppComboboxLoadResult<AppComboboxOption>>
  onImageUpload: (file: File | null | undefined) => Promise<string | null>
  onOpenChange: (open: boolean) => void
  onSubmit: (values: MaterialFormValues) => void
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="text-sm font-medium">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  )
}

export function MaterialFormDialog({
  open,
  loading,
  submitting,
  error,
  mode,
  initialValues,
  unitOptions,
  materialGroupOptions,
  imagePreviewUrl,
  imageUploading,
  loadUnitOptions,
  loadMaterialGroupOptions,
  onImageUpload,
  onOpenChange,
  onSubmit,
}: MaterialFormDialogProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState(initialValues)
  const [unitOpen, setUnitOpen] = useState(false)
  const [materialGroupOpen, setMaterialGroupOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<AppComboboxOption | null>(null)
  const [selectedMaterialGroup, setSelectedMaterialGroup] =
    useState<AppComboboxOption | null>(null)
  const title = mode === "create" ? "Create material" : "Edit material"
  const description =
    mode === "create"
      ? "Add a material master record."
      : "Update the selected material master record."

  useEffect(() => {
    if (open) {
      setDraft(initialValues)
      setSelectedUnit(
        unitOptions.find((option) => option.value === initialValues.unitId) ??
          null
      )
      setSelectedMaterialGroup(
        materialGroupOptions.find(
          (option) => option.value === initialValues.materialGroupId
        ) ?? null
      )
    }
  }, [initialValues, open])

  function update<K extends keyof MaterialFormValues>(key: K, value: MaterialFormValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel required>Name</FieldLabel>
                  <Input
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Input material name"
                    disabled={loading || submitting}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    value={draft.code}
                    onChange={(event) => update("code", event.target.value)}
                    placeholder="MAT-001"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Unit</FieldLabel>
                  <AppCombobox
                    open={unitOpen}
                    onOpenChange={setUnitOpen}
                    value={selectedUnit}
                    onValueChange={(option) => {
                      setSelectedUnit(option)
                      update("unitId", option?.value ?? "")
                      setUnitOpen(false)
                    }}
                    loadItems={loadUnitOptions}
                    initialLimit={10}
                    searchLimit={10}
                    placeholder="Search unit"
                    emptyMessage="No units found."
                    showClear={Boolean(draft.unitId)}
                    disabled={loading || submitting}
                    inputClassName="w-full min-w-0"
                    contentClassName="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Material group</FieldLabel>
                  <AppCombobox
                    open={materialGroupOpen}
                    onOpenChange={setMaterialGroupOpen}
                    value={selectedMaterialGroup}
                    onValueChange={(option) => {
                      setSelectedMaterialGroup(option)
                      update("materialGroupId", option?.value ?? "")
                      setMaterialGroupOpen(false)
                    }}
                    loadItems={loadMaterialGroupOptions}
                    initialLimit={10}
                    searchLimit={10}
                    placeholder="Search material group"
                    emptyMessage="No material groups found."
                    showClear={Boolean(draft.materialGroupId)}
                    disabled={loading || submitting}
                    inputClassName="w-full min-w-0"
                    contentClassName="rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Description</FieldLabel>
                <Input
                  value={draft.description}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="Input material description"
                  disabled={loading || submitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Material image</FieldLabel>
                <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2 dark:border-white/10">
                  {imagePreviewUrl ? (
                    <div className="flex h-32 items-center justify-center rounded-md bg-slate-50/70 dark:bg-white/[0.03]">
                      <img
                        src={imagePreviewUrl}
                        alt="Uploaded material preview"
                        className="h-full w-auto max-w-full rounded object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                      No image uploaded yet.
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageUploading || loading || submitting}
                  >
                    {imageUploading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    Upload image
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Max file size {MATERIAL_IMAGE_MAX_SIZE_LABEL}.
                  </p>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void onImageUpload(event.currentTarget.files?.[0]).then(
                      (imageId) => {
                        if (imageId) {
                          update("imageId", imageId)
                        }
                      }
                    )
                    event.currentTarget.value = ""
                  }}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel>Active</FieldLabel>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Active materials can be used in other application records.
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
                {mode === "create" ? "Save material" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
