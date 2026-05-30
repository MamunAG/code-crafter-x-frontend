"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Loader2, Pencil, RefreshCcw, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"

import {
  createFabricProcess,
  fetchFabricProcesses,
  softDeleteFabricProcess,
  updateFabricProcess,
} from "../fabric-process.service"
import type { FabricProcessRecord } from "../fabric-process.types"

type FabricProcessEntryDialogProps = {
  open: boolean
  apiUrl: string
  organizationId?: string
  onOpenChange: (open: boolean) => void
  onProcessesChanged?: () => void | Promise<void>
}

const EMPTY_FORM = {
  name: "",
  isActive: true,
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function FabricProcessEntryDialog({
  open,
  apiUrl,
  organizationId,
  onOpenChange,
  onProcessesChanged,
}: FabricProcessEntryDialogProps) {
  const [processes, setProcesses] = useState<FabricProcessRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FabricProcessRecord | null>(null)

  const resetForm = useCallback(() => {
    setEditingId(null)
    setFormValues(EMPTY_FORM)
  }, [])

  const loadProcesses = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      const response = await fetchFabricProcesses({
        apiUrl,
        accessToken: token,
        organizationId,
        page: 1,
        limit: 100,
        filters: { name: "", isActive: "" },
      })
      setProcesses(response.items)
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Unable to load fabric processes right now.")
      setError(message)
      setProcesses([])
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, organizationId])

  useEffect(() => {
    if (!open) {
      resetForm()
      setError("")
      setDeleteTarget(null)
      return
    }

    void loadProcesses()
  }, [loadProcesses, open, resetForm])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = formValues.name.trim()
    if (!name) {
      setError("Fabric process name is required.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      if (editingId == null) {
        await createFabricProcess({
          apiUrl,
          accessToken: token,
          organizationId,
          payload: { name, isActive: formValues.isActive },
        })
        toast.success("Fabric process saved successfully.")
      } else {
        await updateFabricProcess({
          apiUrl,
          accessToken: token,
          organizationId,
          id: editingId,
          payload: { name, isActive: formValues.isActive },
        })
        toast.success("Fabric process updated successfully.")
      }

      resetForm()
      await loadProcesses()
      await onProcessesChanged?.()
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Unable to save the fabric process right now.")
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    setError("")

    try {
      const token = window.localStorage.getItem("access_token")
      if (!token) throw new Error("Your session expired. Please sign in again.")

      await softDeleteFabricProcess({
        apiUrl,
        accessToken: token,
        organizationId,
        id: deleteTarget.id,
      })

      if (editingId === deleteTarget.id) resetForm()
      setDeleteTarget(null)
      toast.success("Fabric process deleted successfully.")
      await loadProcesses()
      await onProcessesChanged?.()
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Unable to delete the fabric process right now.")
      setError(message)
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<FabricProcessRecord>[]>(
    () => [
      {
        id: "serial",
        header: "#",
        cell: ({ row }) => <span className="text-xs text-slate-600 dark:text-slate-300">{row.index + 1}</span>,
      },
      {
        accessorKey: "name",
        header: "Process",
        cell: ({ row }) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.original.name}</span>,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive === false ? "outline" : "secondary"} className="rounded-full">
            {row.original.isActive === false ? "Inactive" : "Active"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-md px-2 text-xs"
              onClick={() => {
                setEditingId(row.original.id)
                setFormValues({
                  name: row.original.name,
                  isActive: row.original.isActive !== false,
                })
                setError("")
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-md px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: processes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-1/2 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
          <div className="flex h-full max-h-[100dvh] flex-col sm:max-h-[calc(100vh-2rem)]">
            <div className="border-b border-slate-200/70 px-4 pb-4 pt-5 sm:px-6 sm:pt-6 dark:border-white/10">
              <DialogHeader>
                <DialogTitle>Fabric Process Setup</DialogTitle>
                <DialogDescription>Create, update, and delete processes used in fabric costing rows.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
              <div className="grid min-h-full gap-4 px-4 py-4 sm:px-6 lg:h-full lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {editingId == null ? "New process" : "Edit process"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Active processes appear in fabric costing process comboboxes.
                    </p>
                  </div>

                  {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="fabric-process-entry-name" className="text-xs font-semibold">
                      Process name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fabric-process-entry-name"
                      value={formValues.name}
                      onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Input process name"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950/40">
                    <Label htmlFor="fabric-process-entry-active" className="text-xs font-semibold">
                      Active
                    </Label>
                    <Switch
                      id="fabric-process-entry-active"
                      checked={formValues.isActive}
                      onCheckedChange={(checked) => setFormValues((current) => ({ ...current, isActive: checked }))}
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={saving} className="rounded-md">
                      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      {editingId == null ? "Save" : "Update"}
                    </Button>
                    {editingId != null ? (
                      <Button type="button" variant="outline" onClick={resetForm} className="rounded-md">
                        <X className="size-3.5" />
                        Cancel edit
                      </Button>
                    ) : null}
                  </div>
                </form>

                <div className="flex min-h-0 min-w-0 flex-col rounded-lg border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Saved processes</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {processes.length} process{processes.length === 1 ? "" : "es"}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="icon" className="size-8 rounded-md" onClick={loadProcesses} disabled={loading}>
                      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                    </Button>
                  </div>

                  <ScrollArea className="min-h-0 w-full flex-1" viewportClassName="overflow-auto">
                    <table className="w-full min-w-[560px] border-collapse text-xs">
                      <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id} className="h-9 border-b border-slate-200/70 dark:border-white/10">
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className={`sticky top-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-600 shadow-[inset_0_-1px_0_rgba(226,232,240,0.9)] dark:bg-slate-950 dark:text-slate-300 ${header.column.id === "actions" ? "text-right" : ""}`}
                              >
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-slate-500">
                              Loading fabric processes...
                            </td>
                          </tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-slate-500">
                              No fabric processes saved yet.
                            </td>
                          </tr>
                        ) : (
                          table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="h-10 border-b border-slate-100 align-middle hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className={`px-3 py-2 ${cell.column.id === "actions" ? "text-right" : ""}`}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fabric process</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium text-slate-900 dark:text-slate-100">{deleteTarget?.name ?? "this process"}</span> from new fabric costing selections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
