"use client"

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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import type { SizeFormValues } from "../size.types"

type SizeFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  loading: boolean
  submitting: boolean
  error: string
  values: SizeFormValues
  onOpenChange: (open: boolean) => void
  onChange: (values: SizeFormValues) => void
  onSubmit: () => void
}

export function SizeFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  values,
  onOpenChange,
  onChange,
  onSubmit,
}: SizeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create size" : "Edit size"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a merchandising size master record."
              : "Update the selected merchandising size record."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="sizeName">
                Size name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sizeName"
                value={values.sizeName}
                onChange={(event) =>
                  onChange({
                    ...values,
                    sizeName: event.target.value,
                  })
                }
                placeholder="Input size name"
                required
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="sizeIsActive" className="text-sm font-medium">
                    Active
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active sizes can be used in merchandising records.
                  </p>
                </div>
                <Switch
                  id="sizeIsActive"
                  checked={values.isActive}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...values,
                      isActive: checked,
                    })
                  }
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Save size" : "Update size"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
