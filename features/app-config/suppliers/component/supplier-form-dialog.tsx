"use client"

import { useEffect, useState } from "react"

import { Loader2 } from "lucide-react"

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

import type { SupplierFormValues } from "../supplier.types"

type SupplierEditorMode = "create" | "edit"

type SupplierFormDialogProps = {
  open: boolean
  loading: boolean
  submitting: boolean
  error: string
  mode: SupplierEditorMode
  initialValues: SupplierFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SupplierFormValues) => void
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

export function SupplierFormDialog({
  open,
  loading,
  submitting,
  error,
  mode,
  initialValues,
  onOpenChange,
  onSubmit,
}: SupplierFormDialogProps) {
  const [draft, setDraft] = useState(initialValues)
  const title = mode === "create" ? "Create supplier" : "Edit supplier"
  const description =
    mode === "create"
      ? "Add a supplier master record."
      : "Update the selected supplier master record."

  useEffect(() => {
    if (open) {
      setDraft(initialValues)
    }
  }, [initialValues, open])

  function update<K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) {
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
              <div className="space-y-2">
                <FieldLabel required>Name</FieldLabel>
                <Input
                  value={draft.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Input supplier name"
                  disabled={loading || submitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel required>Display name</FieldLabel>
                <Input
                  value={draft.displayName}
                  onChange={(event) => update("displayName", event.target.value)}
                  placeholder="Input supplier display name"
                  disabled={loading || submitting}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    value={draft.code}
                    onChange={(event) => update("code", event.target.value)}
                    placeholder="SUP-001"
                    disabled={loading || submitting}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Contact</FieldLabel>
                  <Input
                    value={draft.contact}
                    onChange={(event) => update("contact", event.target.value)}
                    placeholder="Input supplier contact"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    value={draft.email}
                    onChange={(event) => update("email", event.target.value)}
                    type="email"
                    placeholder="supplier@example.com"
                    disabled={loading || submitting}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Address</FieldLabel>
                  <Input
                    value={draft.address}
                    onChange={(event) => update("address", event.target.value)}
                    placeholder="Input supplier address"
                    disabled={loading || submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Remarks</FieldLabel>
                <Textarea
                  value={draft.remarks}
                  onChange={(event) => update("remarks", event.target.value)}
                  placeholder="Optional remarks"
                  rows={4}
                  disabled={loading || submitting}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <FieldLabel>Active</FieldLabel>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Active suppliers can be used in other application records.
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
                {mode === "create" ? "Save supplier" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
