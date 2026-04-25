"use client"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { SelectSeparator } from "./ui/select"
import { Button } from "./ui/button"
import { Building2, Plus } from "lucide-react"

const organizations = [
    { id: 1, name: "Northstar Labs" },
    { id: 2, name: "Acme Commerce" },
    { id: 3, name: "Helio Studio" },
    { id: 4, name: "Summit Health" },
    { id: 5, name: "Atlas Partners" },
] as const

type OrganizationComboBoxProps = {
    className?: string
}

export function OrganizationComboBox({ className }: OrganizationComboBoxProps) {
    return (
        <Combobox items={organizations}>
            <ComboboxInput
                placeholder="Switch organization"
                className={className ?? "w-[17rem] max-w-[min(17rem,calc(100vw-7rem))] text-xs"}
            />
            <ComboboxContent className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
                <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                        Organization
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        Choose the organization you want to manage.
                    </p>
                </div>
                <ComboboxEmpty className="py-5 text-xs">
                    No organizations match your search.
                </ComboboxEmpty>
                <ComboboxList className="px-2 py-2">
                    {(item) => (
                        <ComboboxItem
                            key={item.id}
                            value={item.name}
                            className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                        >
                            <Building2 className="size-3 text-slate-400 dark:text-slate-500" />
                            {item.name}
                        </ComboboxItem>
                    )}
                </ComboboxList>
                <SelectSeparator className="my-0 bg-slate-200/80 dark:bg-white/10" />
                <div className="bg-slate-50/80 p-2 dark:bg-white/5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start gap-2 border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <Plus className="size-3" />
                        Create new organization
                    </Button>
                </div>
            </ComboboxContent>
        </Combobox>
    )
}
