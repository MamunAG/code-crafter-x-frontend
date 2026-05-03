/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
    createFactory,
    fetchFactories,
    fetchFactory,
    permanentlyDeleteFactory,
    restoreFactory,
    softDeleteFactory,
    updateFactory,
} from "./factory.service"

import type {
    FactoryFilterValues,
    FactoryFormError,
    FactoryFormValues,
    FactoryRecord,
    PaginationMeta,
} from "./factory.types"
import { ActiveFactorySection } from "./component/active-factory-section"
import { DeletedFactorySection } from "./component/deleted-factory-section"
import { FactoryFormDialog } from "./component/factory-form-dialog"


const DEFAULT_FILTERS: FactoryFilterValues = {
    name: "",
    displayName: "",
    code: "",
    contact: "",
    email: "",
    address: "",
    isActive: "",
}

const DEFAULT_FORM: FactoryFormValues = {
    name: "",
    displayName: "",
    code: "",
    contact: "",
    email: "",
    address: "",
    remarks: "",
    isActive: true,
}

export function FactoryWorkspace({ apiUrl }: { apiUrl: string }) {
    const router = useRouter()

    const [data, setData] = useState<FactoryRecord[]>([])
    const [deletedData, setDeletedData] = useState<FactoryRecord[]>([])

    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)

    const [filters, setFilters] = useState(DEFAULT_FILTERS)
    const [deletedFilters, setDeletedFilters] = useState(DEFAULT_FILTERS)

    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)

    const [deletedPage, setDeletedPage] = useState(1)
    const [deletedLimit, setDeletedLimit] = useState(5)

    const [loading, setLoading] = useState(true)

    const [editorOpen, setEditorOpen] = useState(false)
    const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
    const [form, setForm] = useState(DEFAULT_FORM)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [errors, setErrors] = useState<FactoryFormError[]>([])

    function getToken() {
        const token = localStorage.getItem("access_token")
        if (!token) {
            router.replace("/sign-in")
            throw new Error("Unauthorized")
        }
        return token
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const token = getToken()

            const res = await fetchFactories({
                apiUrl,
                accessToken: token,
                page,
                limit,
                filters,
            })

            const deletedRes = await fetchFactories({
                apiUrl,
                accessToken: token,
                page: deletedPage,
                limit: deletedLimit,
                filters: deletedFilters,
                deletedOnly: true,
            })

            setData(res.items)
            setMeta(res.meta)

            setDeletedData(deletedRes.items)
            setDeletedMeta(deletedRes.meta)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }, [apiUrl, page, limit, filters, deletedPage, deletedLimit, deletedFilters])

    useEffect(() => {
        load()
    }, [])

    function openCreate() {
        setEditorMode("create")
        setForm(DEFAULT_FORM)
        setEditorOpen(true)
    }

    async function openEdit(id: string) {
        setEditorMode("edit")
        setEditingId(id)
        setEditorOpen(true)

        const token = getToken()
        const rec = await fetchFactory({ apiUrl, accessToken: token, id })
        setForm({
            name: rec.name ?? "",
            displayName: rec.displayName ?? "",
            code: rec.code ?? "",
            contact: rec.contact ?? "",
            email: rec.email ?? "",
            address: rec.address ?? "",
            remarks: rec.remarks ?? "",
            isActive: rec.isActive !== false,
        })
    }

    async function submit() {
        try {
            const token = getToken()

            if (!form.name.trim()) {
                setErrors([{ section: "basic-info", message: "Name required" }])
                return
            }

            if (editorMode === "create") {
                await createFactory({ apiUrl, accessToken: token, payload: form })
                toast.success("Factory created")
            } else if (editingId) {
                await updateFactory({
                    apiUrl,
                    accessToken: token,
                    id: editingId,
                    payload: form,
                })
                toast.success("Factory updated")
            }

            setEditorOpen(false)
            load()
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function remove(item: FactoryRecord) {
        const token = getToken()
        await softDeleteFactory({ apiUrl, accessToken: token, id: item.id })
        load()
    }

    async function restore(item: FactoryRecord) {
        const token = getToken()
        await restoreFactory({ apiUrl, accessToken: token, id: item.id })
        load()
    }

    async function permanent(item: FactoryRecord) {
        const token = getToken()
        await permanentlyDeleteFactory({ apiUrl, accessToken: token, id: item.id })
        load()
    }

    return (
        <div className="p-4 space-y-6">
            <ActiveFactorySection
                data={data}
                meta={meta}
                loading={loading}
                page={page}
                limit={limit}
                filters={filters}
                onFilterChange={setFilters}
                onPageChange={setPage}
                onLimitChange={setLimit}
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={remove}
            />

            <DeletedFactorySection
                data={deletedData}
                meta={deletedMeta}
                loading={loading}
                page={deletedPage}
                limit={deletedLimit}
                filters={deletedFilters}
                onFilterChange={setDeletedFilters}
                onPageChange={setDeletedPage}
                onLimitChange={setDeletedLimit}
                onRestore={restore}
                onPermanent={permanent}
            />

            <FactoryFormDialog
                open={editorOpen}
                values={form}
                errors={errors}
                onChange={setForm}
                onSubmit={submit}
                onOpenChange={setEditorOpen}
            />
        </div>
    )
}