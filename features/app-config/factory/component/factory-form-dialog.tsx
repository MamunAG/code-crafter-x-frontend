"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { FactoryFormValues } from "../factory.types"

export function FactoryFormDialog({
    open,
    loading,
    submitting,
    error,
    mode,
    initialValues,
    onOpenChange,
    onSubmit,
}: {
    open: boolean
    loading: boolean
    submitting: boolean
    error: string
    mode: "create" | "edit"
    initialValues: FactoryFormValues
    onOpenChange: (open: boolean) => void
    onSubmit: (values: FactoryFormValues) => void
}) {
    const [draft, setDraft] = useState(initialValues)

    useEffect(() => {
        if (open) {
            setDraft(initialValues)
        }
    }, [initialValues, open])

    function update<K extends keyof FactoryFormValues>(key: K, value: FactoryFormValues[K]) {
        setDraft((current) => ({ ...current, [key]: value }))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl overflow-hidden border-white/70 bg-white/95 shadow-[0_25px_100px_rgba(15,23,42,0.2)] backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {mode === "create" ? "New factory" : "Edit factory"}
                    </DialogTitle>
                    <DialogDescription>
                        Keep the factory profile aligned with the app configuration catalog.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
                        <Input
                            value={draft.name}
                            onChange={(e) => update("name", e.target.value)}
                            placeholder="Factory name"
                            className="rounded-xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Display name</label>
                        <Input
                            value={draft.displayName}
                            onChange={(e) => update("displayName", e.target.value)}
                            placeholder="Factory display name"
                            className="rounded-xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Code</label>
                        <Input
                            value={draft.code}
                            onChange={(e) => update("code", e.target.value)}
                            placeholder="Factory code"
                            className="rounded-xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Contact</label>
                        <Input
                            value={draft.contact}
                            onChange={(e) => update("contact", e.target.value)}
                            placeholder="Contact number"
                            className="rounded-xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                        <Input
                            value={draft.email}
                            onChange={(e) => update("email", e.target.value)}
                            placeholder="Factory email"
                            className="rounded-xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Address</label>
                        <Input
                            value={draft.address}
                            onChange={(e) => update("address", e.target.value)}
                            placeholder="Factory address"
                            className="rounded-xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Remarks</label>
                        <Textarea
                            value={draft.remarks}
                            onChange={(e) => update("remarks", e.target.value)}
                            placeholder="Optional remarks"
                            className="min-h-28 rounded-2xl"
                            disabled={loading || submitting}
                        />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Active</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Toggle whether this factory is selectable.</p>
                        </div>
                        <Switch
                            checked={draft.isActive}
                            onCheckedChange={(checked) => update("isActive", checked)}
                            disabled={loading || submitting}
                        />
                    </div>
                </div>

                {error ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                        {error}
                    </p>
                ) : null}

                <DialogFooter className="gap-2 sm:gap-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => onSubmit(draft)}
                        className="rounded-xl"
                        disabled={loading || submitting}
                    >
                        {submitting ? "Saving..." : mode === "create" ? "Create factory" : "Update factory"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
