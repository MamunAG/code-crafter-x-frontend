"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, RefreshCcw, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { readSelectedOrganizationId, SELECTED_ORGANIZATION_CHANGED_EVENT } from "@/lib/organization-selection"

import { ActiveFactorySection } from "./component/active-factory-section"
import { DeletedFactorySection } from "./component/deleted-factory-section"
import { FactoryFormDialog } from "./component/factory-form-dialog"
import {
    createFactory,
    downloadFactoryTemplate,
    fetchFactories,
    fetchFactory,
    permanentlyDeleteFactory,
    restoreFactory,
    softDeleteFactory,
    updateFactory,
    uploadFactoryTemplate,
} from "./factory.service"
import type { FactoryFilterValues, FactoryFormValues, FactoryRecord, PaginationMeta } from "./factory.types"

type FactoryEditorMode = "create" | "edit"
type PendingDeleteMode = "restore" | "permanent"

const DEFAULT_FILTERS: FactoryFilterValues = {
    name: "",
    displayName: "",
    code: "",
    contact: "",
    email: "",
    address: "",
    isActive: "",
}

const DEFAULT_FORM_VALUES: FactoryFormValues = {
    name: "",
    displayName: "",
    code: "",
    contact: "",
    email: "",
    address: "",
    remarks: "",
    isActive: true,
}

function getFactoryLabel(factory: FactoryRecord) {
    return factory.displayName?.trim() || factory.name
}

function normalizeAuthFailure(message: string) {
    return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")
}

function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
}: {
    title: string
    description: string
    actionLabel: string
    onAction: () => void
}) {
    return (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Plus className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            <Button type="button" onClick={onAction} className="mt-6 rounded-xl">
                {actionLabel}
            </Button>
        </div>
    )
}

function DeleteConfirmDialog({
    open,
    factory,
    working,
    onOpenChange,
    onConfirm,
}: {
    open: boolean
    factory: FactoryRecord | null
    working: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete factory</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will soft delete{" "}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            {factory ? getFactoryLabel(factory) : "this factory"}
                        </span>
                        . You can restore it from the recently deleted card before removing it permanently.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={working}>
                        {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function RecentlyDeletedDialog({
    open,
    action,
    factory,
    working,
    onOpenChange,
    onConfirm,
}: {
    open: boolean
    action: PendingDeleteMode
    factory: FactoryRecord | null
    working: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}) {
    const title = action === "restore" ? "Restore factory" : "Delete factory permanently"
    const description =
        action === "restore"
            ? "Bring this factory back into the active configuration list."
            : "This will permanently remove the factory record and cannot be undone."

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}{" "}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            {factory ? getFactoryLabel(factory) : "this factory"}
                        </span>
                        .
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant={action === "restore" ? "default" : "destructive"} onClick={onConfirm} disabled={working}>
                        {working ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {action === "restore" ? "Restore" : "Delete permanently"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function WorkspaceSkeleton() {
    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ScrollArea className="h-full">
                <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
                        <CardContent className="p-6 sm:p-8">
                            <div className="space-y-3">
                                <div className="h-4 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
                                <div className="h-10 w-72 rounded-full bg-slate-200 dark:bg-slate-800" />
                                <div className="h-4 w-full max-w-2xl rounded-full bg-slate-200 dark:bg-slate-800" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <div className="h-5 w-40 rounded-full bg-slate-200 dark:bg-slate-800" />
                                <div className="h-4 w-64 rounded-full bg-slate-200 dark:bg-slate-800" />
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                    <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                    <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                </div>
                                <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <div className="h-5 w-44 rounded-full bg-slate-200 dark:bg-slate-800" />
                                <div className="h-4 w-72 rounded-full bg-slate-200 dark:bg-slate-800" />
                                <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    )
}

export function FactoryWorkspace({ apiUrl }: { apiUrl: string }) {
    const router = useRouter()
    const uploadInputRef = useRef<HTMLInputElement | null>(null)

    const [loadingFactories, setLoadingFactories] = useState(true)
    const [loadingDeletedFactories, setLoadingDeletedFactories] = useState(true)
    const [error, setError] = useState("")
    const [deletedError, setDeletedError] = useState("")
    const [refreshVersion, setRefreshVersion] = useState(0)
    const [selectedOrganizationId, setSelectedOrganizationId] = useState(() =>
        typeof window === "undefined" ? "" : readSelectedOrganizationId(),
    )

    const [factories, setFactories] = useState<FactoryRecord[]>([])
    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)

    const [deletedFactories, setDeletedFactories] = useState<FactoryRecord[]>([])
    const [deletedMeta, setDeletedMeta] = useState<PaginationMeta | null>(null)
    const [deletedPage, setDeletedPage] = useState(1)
    const [deletedLimit, setDeletedLimit] = useState(5)

    const [activeFilters, setActiveFilters] = useState<FactoryFilterValues>(DEFAULT_FILTERS)
    const [deletedFilters, setDeletedFilters] = useState<FactoryFilterValues>(DEFAULT_FILTERS)

    const [editorOpen, setEditorOpen] = useState(false)
    const [editorMode, setEditorMode] = useState<FactoryEditorMode>("create")
    const [editorLoading, setEditorLoading] = useState(false)
    const [editorSubmitting, setEditorSubmitting] = useState(false)
    const [editorError, setEditorError] = useState("")
    const [editorInitialValues, setEditorInitialValues] = useState<FactoryFormValues>(DEFAULT_FORM_VALUES)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [uploadingTemplate, setUploadingTemplate] = useState(false)
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<FactoryRecord | null>(null)
    const [deleteWorking, setDeleteWorking] = useState(false)
    const [recentlyDeletedFactory, setRecentlyDeletedFactory] = useState<FactoryRecord | null>(null)
    const [pendingActionTarget, setPendingActionTarget] = useState<FactoryRecord | null>(null)
    const [pendingActionMode, setPendingActionMode] = useState<PendingDeleteMode | null>(null)
    const [pendingActionWorking, setPendingActionWorking] = useState(false)

    const handleAuthFailure = useCallback(
        (message: string) => {
            if (!normalizeAuthFailure(message)) {
                return false
            }

            if (typeof window !== "undefined") {
                window.localStorage.removeItem("access_token")
                window.localStorage.removeItem("refresh_token")
                window.localStorage.removeItem("auth_user")
            }

            router.replace("/sign-in")
            return true
        },
        [router],
    )

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        function handleOrganizationChange(event: Event) {
            const nextOrganizationId =
                event instanceof CustomEvent
                    ? event.detail?.organizationId
                    : readSelectedOrganizationId()

            setSelectedOrganizationId(nextOrganizationId || "")
        }

        window.addEventListener(
            SELECTED_ORGANIZATION_CHANGED_EVENT,
            handleOrganizationChange,
        )

        return () => {
            window.removeEventListener(
                SELECTED_ORGANIZATION_CHANGED_EVENT,
                handleOrganizationChange,
            )
        }
    }, [])

    const triggerRefresh = useCallback(() => {
        setRefreshVersion((current) => current + 1)
    }, [])

    const loadFactories = useCallback(async () => {
        setLoadingFactories(true)
        setLoadingDeletedFactories(true)
        setError("")
        setDeletedError("")

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            const [activeResponse, deletedResponse] = await Promise.all([
                fetchFactories({
                    apiUrl,
                    accessToken: token,
                    page,
                    limit,
                    filters: activeFilters,
                    organizationId: selectedOrganizationId || undefined,
                }),
                fetchFactories({
                    apiUrl,
                    accessToken: token,
                    page: deletedPage,
                    limit: deletedLimit,
                    filters: deletedFilters,
                    deletedOnly: true,
                    organizationId: selectedOrganizationId || undefined,
                }),
            ])

            setFactories(activeResponse.items)
            setMeta(activeResponse.meta)
            setDeletedFactories(deletedResponse.items)
            setDeletedMeta(deletedResponse.meta)
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to load factory data right now."

            if (!handleAuthFailure(message)) {
                setError(message)
                toast.error(message)
            }
        } finally {
            setLoadingFactories(false)
            setLoadingDeletedFactories(false)
        }
    }, [apiUrl, activeFilters, deletedFilters, deletedLimit, deletedPage, handleAuthFailure, limit, page, selectedOrganizationId])

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        void loadFactories()
    }, [loadFactories, refreshVersion])

    async function openCreateDialog() {
        setEditorMode("create")
        setEditorError("")
        setEditingId(null)
        setEditorInitialValues(DEFAULT_FORM_VALUES)
        setEditorOpen(true)
    }

    const openEditDialog = useCallback(async (id: string) => {
        setEditorMode("edit")
        setEditingId(id)
        setEditorOpen(true)
        setEditorLoading(true)
        setEditorError("")

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            const rec = await fetchFactory({
                apiUrl,
                accessToken: token,
                id,
                organizationId: selectedOrganizationId || undefined,
            })
            setEditorInitialValues({
                name: rec.name ?? "",
                displayName: rec.displayName ?? "",
                code: rec.code ?? "",
                contact: rec.contact ?? "",
                email: rec.email ?? "",
                address: rec.address ?? "",
                remarks: rec.remarks ?? "",
                isActive: rec.isActive !== false,
            })
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to load the selected factory."

            if (!handleAuthFailure(message)) {
                setEditorError(message)
                toast.error(message)
            }
        } finally {
            setEditorLoading(false)
        }
    }, [apiUrl, handleAuthFailure, selectedOrganizationId])

    const submitEditor = useCallback(async (values: FactoryFormValues) => {
        if (!values.name.trim()) {
            setEditorError("Factory name is required.")
            return
        }

        if (!values.displayName.trim()) {
            setEditorError("Factory display name is required.")
            return
        }

        setEditorSubmitting(true)
        setEditorError("")

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            if (editorMode === "create") {
                await createFactory({
                    apiUrl,
                    accessToken: token,
                    payload: values,
                    organizationId: selectedOrganizationId || undefined,
                })
                toast.success("Factory created successfully.")
            } else if (editingId != null) {
                await updateFactory({
                    apiUrl,
                    accessToken: token,
                    id: editingId,
                    payload: values,
                    organizationId: selectedOrganizationId || undefined,
                })
                toast.success("Factory updated successfully.")
            }

            setEditorOpen(false)
            setEditorInitialValues(DEFAULT_FORM_VALUES)
            setEditingId(null)
            triggerRefresh()
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to save the factory right now."

            if (!handleAuthFailure(message)) {
                setEditorError(message)
                toast.error(message)
            }
        } finally {
            setEditorSubmitting(false)
        }
    }, [apiUrl, editingId, editorMode, handleAuthFailure, selectedOrganizationId, triggerRefresh])

    const downloadTemplateFile = useCallback(async () => {
        setDownloadingTemplate(true)

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            const blob = await downloadFactoryTemplate({
                apiUrl,
                accessToken: token,
                organizationId: selectedOrganizationId || undefined,
            })

            const url = window.URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = "factory-upload-template.csv"
            anchor.click()
            window.URL.revokeObjectURL(url)
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to download the factory template right now."

            if (!handleAuthFailure(message)) {
                toast.error(message)
            }
        } finally {
            setDownloadingTemplate(false)
        }
    }, [apiUrl, handleAuthFailure, selectedOrganizationId])

    const uploadTemplate = useCallback(async (file?: File) => {
        if (!file) {
            return
        }

        setUploadingTemplate(true)

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            await uploadFactoryTemplate({
                apiUrl,
                accessToken: token,
                file,
                organizationId: selectedOrganizationId || undefined,
            })
            toast.success("Factory template uploaded successfully.")
            triggerRefresh()
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to upload the factory template right now."

            if (!handleAuthFailure(message)) {
                toast.error(message)
            }
        } finally {
            setUploadingTemplate(false)
            if (uploadInputRef.current) {
                uploadInputRef.current.value = ""
            }
        }
    }, [apiUrl, handleAuthFailure, selectedOrganizationId, triggerRefresh])

    async function requestSoftDelete(item: FactoryRecord) {
        setDeleteTarget(item)
    }

    const confirmSoftDelete = useCallback(async () => {
        if (!deleteTarget || deleteWorking) {
            return
        }

        setDeleteWorking(true)

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            await softDeleteFactory({
                apiUrl,
                accessToken: token,
                id: deleteTarget.id,
                organizationId: selectedOrganizationId || undefined,
            })

            setRecentlyDeletedFactory(deleteTarget)
            setDeleteTarget(null)
            toast.success("Factory moved to recently deleted.")
            triggerRefresh()
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to delete the factory right now."

            if (!handleAuthFailure(message)) {
                toast.error(message)
            }
        } finally {
            setDeleteWorking(false)
        }
    }, [apiUrl, deleteTarget, deleteWorking, handleAuthFailure, selectedOrganizationId, triggerRefresh])

    function openPendingActionDialog(factory: FactoryRecord, action: PendingDeleteMode) {
        setPendingActionTarget(factory)
        setPendingActionMode(action)
    }

    const confirmPendingAction = useCallback(async () => {
        if (!pendingActionTarget || !pendingActionMode || pendingActionWorking) {
            return
        }

        setPendingActionWorking(true)

        try {
            const token = window.localStorage.getItem("access_token")

            if (!token) {
                handleAuthFailure("Your session expired. Please sign in again.")
                return
            }

            if (pendingActionMode === "restore") {
                await restoreFactory({
                    apiUrl,
                    accessToken: token,
                    id: pendingActionTarget.id,
                    organizationId: selectedOrganizationId || undefined,
                })
                toast.success("Factory restored successfully.")
            } else {
                await permanentlyDeleteFactory({
                    apiUrl,
                    accessToken: token,
                    id: pendingActionTarget.id,
                    organizationId: selectedOrganizationId || undefined,
                })
                toast.success("Factory deleted permanently.")
            }

            if (recentlyDeletedFactory?.id === pendingActionTarget.id) {
                setRecentlyDeletedFactory(null)
            }

            setPendingActionTarget(null)
            setPendingActionMode(null)
            triggerRefresh()
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to complete the delete action right now."

            if (!handleAuthFailure(message)) {
                toast.error(message)
            }
        } finally {
            setPendingActionWorking(false)
        }
    }, [apiUrl, handleAuthFailure, pendingActionMode, pendingActionTarget, pendingActionWorking, recentlyDeletedFactory, selectedOrganizationId, triggerRefresh])

    const deletedTotal = deletedMeta?.total ?? deletedFactories.length
    const activeTotal = meta?.total ?? factories.length
    const activeCount = useMemo(
        () => factories.filter((factory) => factory.deleted_at == null).length,
        [factories],
    )

    if (
        loadingFactories &&
        factories.length === 0 &&
        loadingDeletedFactories &&
        deletedFactories.length === 0 &&
        !error &&
        !deletedError
    ) {
        return <WorkspaceSkeleton />
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Card className="border-white/60 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
                    <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    App configuration
                                </p>
                                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                                    Factory Setup
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    Manage factory master data.
                                </p>
                            </div>
                            <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                                <RefreshCcw className="size-3.5" />
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <EmptyState
                    title="Unable to load factories"
                    description={error}
                    actionLabel="Try again"
                    onAction={triggerRefresh}
                />
            </div>
        )
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ScrollArea className="h-full">
                <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                    <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
                        <CardContent className="p-4 sm:p-8 sm:py-2">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1.5">
                                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                        App configuration
                                    </p>
                                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                                        Factory Setup
                                    </h1>
                                    <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        Create, review, and maintain factory records.
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                                            Total {activeTotal}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full px-3 py-1">
                                            Active {activeCount}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full px-3 py-1">
                                            Deleted {deletedTotal}
                                        </Badge>
                                        {recentlyDeletedFactory ? (
                                            <Badge variant="destructive" className="rounded-full px-3 py-1">
                                                Recently deleted
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button type="button" variant="outline" onClick={triggerRefresh} className="rounded-xl">
                                        <RefreshCcw className="size-3.5" />
                                        Refresh
                                    </Button>
                                    <Button type="button" onClick={openCreateDialog} className="rounded-xl">
                                        <Plus className="size-3.5" />
                                        New factory
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {recentlyDeletedFactory ? (
                        <Card className="border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                                            Recently deleted factory
                                        </p>
                                        <p className="text-sm text-amber-900/80 dark:text-amber-100/85">
                                            {getFactoryLabel(recentlyDeletedFactory)} was soft deleted and can still be restored.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-xl border-amber-300 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-400/40 dark:bg-transparent dark:text-amber-50"
                                            onClick={() => openPendingActionDialog(recentlyDeletedFactory, "restore")}
                                        >
                                            <Undo2 className="size-3.5" />
                                            Restore
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="rounded-xl"
                                            onClick={() => openPendingActionDialog(recentlyDeletedFactory, "permanent")}
                                        >
                                            <Trash2 className="size-3.5" />
                                            Delete permanently
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    <ActiveFactorySection
                        data={factories}
                        meta={meta}
                        loading={loadingFactories}
                        page={page}
                        limit={limit}
                        filters={activeFilters}
                        onFilterChange={setActiveFilters}
                        onPageChange={setPage}
                        onLimitChange={setLimit}
                        onCreate={openCreateDialog}
                        onEdit={openEditDialog}
                        onDelete={requestSoftDelete}
                        onDownloadTemplate={downloadTemplateFile}
                        onUploadTemplate={() => uploadInputRef.current?.click()}
                    />

                    <input
                        ref={uploadInputRef}
                        type="file"
                        accept=".csv,text/csv,application/vnd.ms-excel"
                        className="hidden"
                        onChange={(event) => void uploadTemplate(event.target.files?.[0])}
                    />

                    <DeletedFactorySection
                        data={deletedFactories}
                        meta={deletedMeta}
                        loading={loadingDeletedFactories}
                        page={deletedPage}
                        limit={deletedLimit}
                        filters={deletedFilters}
                        onFilterChange={setDeletedFilters}
                        onPageChange={setDeletedPage}
                        onLimitChange={setDeletedLimit}
                        onOpenAction={(factory: FactoryRecord, mode) => openPendingActionDialog(factory, mode)}
                    />
                </div>
            </ScrollArea>

            <FactoryFormDialog
                open={editorOpen}
                loading={editorLoading}
                submitting={editorSubmitting}
                error={editorError}
                mode={editorMode}
                initialValues={editorInitialValues}
                onOpenChange={(open) => {
                    setEditorOpen(open)

                    if (!open) {
                        setEditorInitialValues(DEFAULT_FORM_VALUES)
                        setEditorError("")
                        setEditorLoading(false)
                        setEditorSubmitting(false)
                        setEditingId(null)
                    }
                }}
                onSubmit={submitEditor}
            />

            <DeleteConfirmDialog
                open={Boolean(deleteTarget)}
                factory={deleteTarget}
                working={deleteWorking}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTarget(null)
                    }
                }}
                onConfirm={confirmSoftDelete}
            />

            <RecentlyDeletedDialog
                open={Boolean(pendingActionTarget && pendingActionMode)}
                action={pendingActionMode ?? "restore"}
                factory={pendingActionTarget}
                working={pendingActionWorking}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingActionTarget(null)
                        setPendingActionMode(null)
                    }
                }}
                onConfirm={confirmPendingAction}
            />
        </div>
    )
}
