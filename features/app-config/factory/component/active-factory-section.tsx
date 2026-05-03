"use client"

import { useMemo } from "react"
import {
    MoreHorizontal,
    Search,
    Download,
    Upload,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react"

import {
    ColumnDef,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"

import { AppDataTable } from "@/components/app-data-table"
import { AppSelect } from "@/components/app-select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import type {
    FactoryRecord,
    FactoryFilterValues,
    PaginationMeta,
} from "../factory.types"

const ALL_STATUS = "__all__"

function formatDate(value?: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleString()
}

export function ActiveFactorySection({
    data,
    meta,
    loading,
    page,
    limit,
    filters,
    onFilterChange,
    onPageChange,
    onLimitChange,
    onCreate,
    onEdit,
    onDelete,
    onDownloadTemplate,
    onUploadTemplate,
}: {
    data: FactoryRecord[]
    meta: PaginationMeta | null
    loading: boolean
    page: number
    limit: number
    filters: FactoryFilterValues
    onFilterChange: (f: FactoryFilterValues) => void
    onPageChange: (p: number) => void
    onLimitChange: (l: number) => void
    onCreate: () => void
    onEdit: (id: string) => void
    onDelete: (row: FactoryRecord) => void
    onDownloadTemplate?: () => void
    onUploadTemplate?: () => void
}) {

    const columns = useMemo<ColumnDef<FactoryRecord>[]>(() => [
        {
            header: "Factory",
            cell: ({ row }) => (
                <div className="pl-4">
                    <p className="text-xs font-semibold">{row.original.name}</p>
                    <p className="text-[11px] text-gray-500">{row.original.displayName}</p>
                </div>
            ),
        },
        {
            header: "Code",
            cell: ({ row }) => row.original.code ?? "-",
        },
        {
            header: "Contact",
            cell: ({ row }) => row.original.contact ?? "-",
        },
        {
            header: "Email",
            cell: ({ row }) => row.original.email ?? "-",
        },
        {
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={row.original.isActive ? "secondary" : "outline"}>
                    {row.original.isActive ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            header: "Created",
            cell: ({ row }) => formatDate(row.original.created_at),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost">
                            <MoreHorizontal className="size-3.5" />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(row.original)}
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ], [onEdit, onDelete])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const pageSummary = meta
        ? `Page ${meta.page} of ${meta.totalPages}`
        : "No data"

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between">
                    <div>
                        <CardTitle>Factory Table</CardTitle>
                        <CardDescription>{pageSummary}</CardDescription>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={onCreate}>New Factory</Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={onDownloadTemplate}>
                                    <Download className="mr-2 size-3.5" />
                                    Download Template
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={onUploadTemplate}>
                                    <Upload className="mr-2 size-3.5" />
                                    Upload
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>

            {/* FILTER */}
            <CardContent className="grid grid-cols-3 gap-3">
                <Input
                    placeholder="Name"
                    value={filters.name}
                    onChange={(e) =>
                        onFilterChange({ ...filters, name: e.target.value })
                    }
                />

                <Input
                    placeholder="Code"
                    value={filters.code}
                    onChange={(e) =>
                        onFilterChange({ ...filters, code: e.target.value })
                    }
                />

                <AppSelect
                    value={filters.isActive || ALL_STATUS}
                    onValueChange={(v) =>
                        onFilterChange({
                            ...filters,
                            isActive: v === ALL_STATUS ? "" : v,
                        })
                    }
                    options={[
                        { value: ALL_STATUS, label: "All" },
                        { value: "true", label: "Active" },
                        { value: "false", label: "Inactive" },
                    ]}
                />
            </CardContent>

            {/* TABLE */}
            <CardContent className="p-0">
                <AppDataTable
                    table={table}
                    page={page}
                    totalPages={meta?.totalPages ?? 1}
                    pageSize={limit}
                    isLoading={loading}
                    onPageChange={onPageChange}
                    onPageSizeChange={onLimitChange}
                />
            </CardContent>

            {/* PAGINATION MOBILE */}
            <div className="flex justify-between p-3">
                <Button onClick={() => onPageChange(1)}>
                    <ChevronsLeft />
                </Button>
                <Button onClick={() => onPageChange(page - 1)}>
                    <ChevronLeft />
                </Button>
                <Button onClick={() => onPageChange(page + 1)}>
                    <ChevronRight />
                </Button>
                <Button onClick={() => onPageChange(meta?.totalPages || 1)}>
                    <ChevronsRight />
                </Button>
            </div>
        </Card>
    )
}