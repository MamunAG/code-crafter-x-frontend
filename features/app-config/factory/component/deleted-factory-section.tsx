/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Button } from "@/components/ui/button"

export function DeletedFactorySection({
    data,
    onRestore,
    onPermanent,
}: any) {
    return (
        <div className="border p-4 rounded-xl space-y-4">
            <h2>Deleted Factories</h2>

            {data.map((f: any) => (
                <div key={f.id} className="flex justify-between border p-3 rounded">
                    <div>{f.name}</div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => onRestore(f)}>Restore</Button>
                        <Button size="sm" variant="destructive" onClick={() => onPermanent(f)}>Delete Permanently</Button>
                    </div>
                </div>
            ))}
        </div>
    )
}