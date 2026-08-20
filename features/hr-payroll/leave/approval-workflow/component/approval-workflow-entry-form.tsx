"use client"
import { Loader2, Plus, X } from "lucide-react"
import { AppSelect } from "@/components/app-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import type { MasterDataFormValues } from "../../../master-data/master-data.types"
type Level = Record<string, unknown>
const text = (v: unknown) => String(v ?? "")
export function ApprovalWorkflowEntryForm({
  open,
  mode,
  values,
  submitting,
  error,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean
  mode: "create" | "edit"
  values: MasterDataFormValues
  submitting: boolean
  error: string
  onOpenChange: (v: boolean) => void
  onChange: (v: MasterDataFormValues) => void
  onSubmit: () => void
}) {
  const levels = (
    Array.isArray(values.settings.levels) ? values.settings.levels : []
  ) as Level[]
  const setLevels = (next: Level[]) =>
    onChange({ ...values, settings: { ...values.settings, levels: next } })
  const update = (index: number, key: string, value: unknown) =>
    setLevels(
      levels.map((level, row) =>
        row === index ? { ...level, [key]: value } : level
      )
    )
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= levels.length) return
    const next = [...levels]
    ;[next[index], next[target]] = [next[target], next[index]]
    setLevels(next.map((level, row) => ({ ...level, levelNumber: row + 1 })))
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>
              {mode === "create"
                ? "Create approval workflow"
                : "Edit approval workflow"}
            </DialogTitle>
            <DialogDescription>
              Add and reorder levels. User, role, and designation identifiers
              appear only for matching approver types.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <Label>Code *</Label>
                <Input
                  value={values.code}
                  disabled={mode === "edit"}
                  onChange={(e) =>
                    onChange({ ...values, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={values.name}
                  onChange={(e) =>
                    onChange({ ...values, name: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={values.settings.active !== false}
                  onCheckedChange={(v) =>
                    onChange({
                      ...values,
                      settings: { ...values.settings, active: v },
                    })
                  }
                />
                Active workflow
              </label>
              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Approval levels</p>
                    <p className="text-muted-foreground">
                      Level numbers must be unique.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLevels([
                        ...levels,
                        {
                          levelNumber: levels.length + 1,
                          name: `Level ${levels.length + 1}`,
                          approverType: "REPORTING_MANAGER",
                          minimumApprovals: 1,
                          mandatory: true,
                          allowSelfApproval: false,
                          canReject: true,
                          canReturn: true,
                          notifications: true,
                        },
                      ])
                    }
                  >
                    <Plus />
                    Add level
                  </Button>
                </div>
                {levels.map((level, index) => {
                  const type = text(level.approverType) || "REPORTING_MANAGER"
                  return (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3"
                    >
                      <Input
                        type="number"
                        min={1}
                        value={text(level.levelNumber) || String(index + 1)}
                        onChange={(e) =>
                          update(index, "levelNumber", Number(e.target.value))
                        }
                      />
                      <Input
                        placeholder="Level name"
                        value={text(level.name)}
                        onChange={(e) => update(index, "name", e.target.value)}
                      />
                      <AppSelect
                        value={type}
                        onValueChange={(v) => update(index, "approverType", v)}
                        options={[
                          "SPECIFIC_USER",
                          "ROLE",
                          "REPORTING_MANAGER",
                          "DEPARTMENT_HEAD",
                          "SECTION_HEAD",
                          "HR",
                          "DESIGNATION",
                        ].map((v) => ({
                          value: v,
                          label: v.replaceAll("_", " "),
                        }))}
                        triggerClassName="h-9"
                      />
                      {type === "SPECIFIC_USER" ? (
                        <Input
                          placeholder="User UUID"
                          value={text(level.userId)}
                          onChange={(e) =>
                            update(index, "userId", e.target.value)
                          }
                        />
                      ) : null}
                      {type === "ROLE" ? (
                        <Input
                          placeholder="Role UUID"
                          value={text(level.roleId)}
                          onChange={(e) =>
                            update(index, "roleId", e.target.value)
                          }
                        />
                      ) : null}
                      {type === "DESIGNATION" ? (
                        <Input
                          placeholder="Designation UUID"
                          value={text(level.designationId)}
                          onChange={(e) =>
                            update(index, "designationId", e.target.value)
                          }
                        />
                      ) : null}
                      <Input
                        type="number"
                        min={1}
                        placeholder="Minimum approvals"
                        value={text(level.minimumApprovals) || "1"}
                        onChange={(e) =>
                          update(
                            index,
                            "minimumApprovals",
                            Number(e.target.value)
                          )
                        }
                      />
                      <div className="flex flex-wrap gap-3 sm:col-span-2">
                        {[
                          ["mandatory", "Mandatory"],
                          ["allowSelfApproval", "Self approval"],
                          ["canReject", "Can reject"],
                          ["canReturn", "Can return"],
                          ["notifications", "Notifications"],
                        ].map(([key, label]) => (
                          <label key={key} className="flex items-center gap-1">
                            <Switch
                              checked={Boolean(level[key])}
                              onCheckedChange={(v) => update(index, key, v)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 sm:col-span-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          Move up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === levels.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          Move down
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setLevels(
                              levels
                                .filter((_, row) => row !== index)
                                .map((item, row) => ({
                                  ...item,
                                  levelNumber: row + 1,
                                }))
                            )
                          }
                        >
                          <X />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {error ? (
                <Alert variant="destructive" className="sm:col-span-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </ScrollArea>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={onSubmit}>
              {submitting ? <Loader2 className="animate-spin" /> : null}Save
              workflow
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
