"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { FactoryFormValues, FactoryFormError } from "../factory.types"

export function FactoryFormDialog({
    open,
    values,
    errors,
    onChange,
    onSubmit,
    onOpenChange,
}: {
    open: boolean
    values: FactoryFormValues
    errors: FactoryFormError[]
    onChange: (v: FactoryFormValues) => void
    onSubmit: () => void
    onOpenChange: (o: boolean) => void
}) {
    function update<K extends keyof FactoryFormValues>(k: K, v: FactoryFormValues[K]) {
        onChange({ ...values, [k]: v })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg space-y-4">
                <Input placeholder="Name" value={values.name} onChange={(e) => update("name", e.target.value)} />
                <Input placeholder="Display Name" value={values.displayName} onChange={(e) => update("displayName", e.target.value)} />
                <Input placeholder="Code" value={values.code} onChange={(e) => update("code", e.target.value)} />
                <Input placeholder="Contact" value={values.contact} onChange={(e) => update("contact", e.target.value)} />
                <Input placeholder="Email" value={values.email} onChange={(e) => update("email", e.target.value)} />
                <Input placeholder="Address" value={values.address} onChange={(e) => update("address", e.target.value)} />

                <Textarea placeholder="Remarks" value={values.remarks} onChange={(e) => update("remarks", e.target.value)} />

                <div className="flex items-center justify-between">
                    <span>Active</span>
                    <Switch checked={values.isActive} onCheckedChange={(v) => update("isActive", v)} />
                </div>

                <Button onClick={onSubmit}>Save</Button>
            </DialogContent>
        </Dialog>
    )
}