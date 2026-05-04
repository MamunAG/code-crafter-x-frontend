"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { DepartmentFormValues } from "../department.types"

type DepartmentFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  error: string
  initialValues: DepartmentFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: DepartmentFormValues) => void
}

export function DepartmentFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: DepartmentFormDialogProps) {
  const [draft, setDraft] = useState(initialValues)

  useEffect(() => {
    if (open) setDraft(initialValues)
  }, [initialValues, open])

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
              <DialogTitle>{mode === "create" ? "Create department" : "Edit department"}</DialogTitle>
              <DialogDescription>
                {mode === "create" ? "Add a department master record." : "Update the selected department master record."}
              </DialogDescription>
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
                <label className="text-sm font-medium">
                  Department name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={draft.departmentName}
                  onChange={(event) => setDraft((current) => ({ ...current, departmentName: event.target.value }))}
                  placeholder="Input department name"
                  disabled={loading || submitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Optional description"
                  rows={4}
                  disabled={loading || submitting}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Active</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Active departments can be selected in HR and payroll records.
                    </p>
                  </div>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))}
                    disabled={loading || submitting}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || submitting} className="rounded-xl">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save department" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
