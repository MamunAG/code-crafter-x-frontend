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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { ColorFormValues } from "../color.types"

type ColorEditorMode = "create" | "edit"

type ColorFormDialogProps = {
  open: boolean
  mode: ColorEditorMode
  loading: boolean
  submitting: boolean
  error: string
  values: ColorFormValues
  onOpenChange: (open: boolean) => void
  onChange: (nextValues: ColorFormValues) => void
  onSubmit: () => void
}

const NEUTRAL_COLOR_SWATCH = "#9CA3AF"

function isValidHexColorCode(value: string) {
  return /^#?[0-9A-Fa-f]{6}$/.test(value.trim())
}

function normalizeHexColorCode(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

function getPickerColorValue(hexCode: string) {
  if (isValidHexColorCode(hexCode)) {
    return normalizeHexColorCode(hexCode)
  }

  return NEUTRAL_COLOR_SWATCH
}

export function ColorFormDialog({
  open,
  mode,
  loading,
  submitting,
  error,
  values,
  onOpenChange,
  onChange,
  onSubmit,
}: ColorFormDialogProps) {
  const title = mode === "create" ? "Create color" : "Edit color"
  const description =
    mode === "create"
      ? "Add a merchandising color master record."
      : "Update the selected merchandising color master record."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-5">
              {loading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-7 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-7 w-28 rounded-md" />
                </div>
              ) : (
                <>
                  {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <label htmlFor="colorName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Color name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="colorName"
                      value={values.colorName}
                      required
                      onChange={(event) =>
                        onChange({ ...values, colorName: event.target.value })
                      }
                      placeholder="Input color name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="colorDisplayName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Display name
                    </label>
                    <Input
                      id="colorDisplayName"
                      value={values.colorDisplayName}
                      onChange={(event) =>
                        onChange({ ...values, colorDisplayName: event.target.value })
                      }
                      placeholder="Input color display name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="colorDescription" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Description
                    </label>
                    <Textarea
                      id="colorDescription"
                      value={values.colorDescription}
                      onChange={(event) =>
                        onChange({ ...values, colorDescription: event.target.value })
                      }
                      placeholder="Input description"
                      className="min-h-24"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="colorHexCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Hex color code
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="colorHexCode"
                        value={values.colorHexCode}
                        onChange={(event) =>
                          onChange({ ...values, colorHexCode: event.target.value })
                        }
                        placeholder="Input hex color code"
                        className="sm:flex-1"
                      />
                      <label
                        htmlFor="colorHexCodePicker"
                        className="size-8 shrink-0 cursor-pointer rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-105 dark:border-white/10"
                        style={{
                          backgroundColor: isValidHexColorCode(values.colorHexCode)
                            ? normalizeHexColorCode(values.colorHexCode)
                            : NEUTRAL_COLOR_SWATCH,
                        }}
                      >
                        <span className="sr-only">Pick a color</span>
                        <Input
                          id="colorHexCodePicker"
                          type="color"
                          aria-label="Pick a color"
                          value={getPickerColorValue(values.colorHexCode)}
                          onChange={(event) =>
                            onChange({
                              ...values,
                              colorHexCode: normalizeHexColorCode(event.target.value),
                            })
                          }
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      Optional. Use a 6-digit hex value such as #1E88E5.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-slate-50/70 px-3 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Active
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Active colors are available for use in merchandising flows.
                      </p>
                    </div>
                    <Switch
                      checked={values.isActive}
                      onCheckedChange={(checked) =>
                        onChange({ ...values, isActive: Boolean(checked) })
                      }
                    />
                  </div>
                </>
              )}
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
              <Button
                type="button"
                onClick={onSubmit}
                disabled={loading || submitting}
                className="rounded-xl"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {mode === "create" ? "Create color" : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
