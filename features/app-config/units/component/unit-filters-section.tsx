"use client"

import { useMemo } from "react"

import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { UnitFilterValues } from "../unit.types"

type UnitFiltersSectionProps = {
  draftFilters: UnitFilterValues
  onDraftFiltersChange: (nextValues: UnitFilterValues) => void
  onActiveFiltersChange: (nextValues: UnitFilterValues) => void
  onPageChange: (nextPage: number | ((current: number) => number)) => void
  onResetFilters: () => void
}

export function UnitFiltersSection({
  draftFilters,
  onDraftFiltersChange,
  onActiveFiltersChange,
  onPageChange,
  onResetFilters,
}: UnitFiltersSectionProps) {
  const filterCount = useMemo(
    () => [draftFilters.name, draftFilters.shortName, draftFilters.isActive !== "all" ? "x" : ""].filter((value) => value.trim()).length,
    [draftFilters],
  )

  return (
    <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader className="border-b border-slate-200/70 py-0 dark:border-white/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription className="text-xs">Search by unit name, short name, or status.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5 text-[11px]">
            {filterCount} active filter{filterCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-0 sm:px-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onActiveFiltersChange(draftFilters)
            onPageChange(1)
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterUnitName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Unit name
            </label>
            <Input
              id="filterUnitName"
              value={draftFilters.name}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDraftFiltersChange({ ...draftFilters, name: event.target.value })}
              placeholder="Input unit name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterUnitShortName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Short name
            </label>
            <Input
              id="filterUnitShortName"
              value={draftFilters.shortName}
              className="h-7 rounded-md px-2 text-xs"
              onChange={(event) => onDraftFiltersChange({ ...draftFilters, shortName: event.target.value })}
              placeholder="Input unit short name"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="filterUnitStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <Select
              value={draftFilters.isActive}
              onValueChange={(value) =>
                onDraftFiltersChange({
                  ...draftFilters,
                  isActive: value as UnitFilterValues["isActive"],
                })
              }
            >
              <SelectTrigger id="filterUnitStatus" className="h-9 w-full rounded-md px-2 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end xl:col-span-1">
            <Button type="submit" className="w-full rounded-xl sm:w-auto">
              <Search className="size-3.5" />
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={onResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
