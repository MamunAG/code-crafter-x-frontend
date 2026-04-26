"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, RefreshCcw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fetchUserOrganizations } from "@/features/organization/organization.service"
import type { OrganizationRecord } from "@/features/organization/organization.types"
import { parseStoredAuthUser } from "@/lib/auth-session"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
  writeSelectedOrganizationId,
} from "@/lib/organization-selection"
import { createMenu, deleteMenu, fetchMenus, updateMenu } from "./menu.service"
import type { MenuFormValues, MenuRecord, PaginationMeta } from "./menu.types"

const EMPTY_FORM: MenuFormValues = {
  organizationId: "",
  menuName: "",
  menuPath: "",
  description: "",
  displayOrder: 0,
  isActive: true,
}

export function MenuEntryPage() {
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [menus, setMenus] = useState<MenuRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [formValues, setFormValues] = useState<MenuFormValues>(EMPTY_FORM)
  const [editingMenu, setEditingMenu] = useState<MenuRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  )

  const loadOrganizations = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))

    if (!apiUrl || !accessToken || !storedUser?.id) {
      setError("Please sign in again to manage menu entries.")
      setLoading(false)
      return
    }

    const userOrganizations = await fetchUserOrganizations({
      apiUrl,
      accessToken,
      userId: storedUser.id,
    })
    const storedOrganizationId = readSelectedOrganizationId()
    const nextSelectedOrganization =
      userOrganizations.find((organization) => organization.id === storedOrganizationId)
      ?? userOrganizations.find((organization) => organization.isDefault)
      ?? userOrganizations[0]
      ?? null

    setOrganizations(userOrganizations)

    if (nextSelectedOrganization) {
      setSelectedOrganizationId(nextSelectedOrganization.id)
      writeSelectedOrganizationId(nextSelectedOrganization.id)
    }
  }, [])

  const loadMenus = useCallback(
    async ({ nextPage = page, silent = false } = {}) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const accessToken = window.localStorage.getItem("access_token")

      if (!apiUrl || !accessToken || !selectedOrganizationId) {
        setMenus([])
        setMeta(null)
        setLoading(false)
        return
      }

      if (!silent) {
        setLoading(true)
      }

      try {
        setError("")
        const result = await fetchMenus({
          apiUrl,
          accessToken,
          organizationId: selectedOrganizationId,
          page: nextPage,
          limit: 20,
        })

        setMenus(result.items)
        setMeta(result.meta)
        setPage(result.meta.page)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load menu entries right now."
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    },
    [page, selectedOrganizationId],
  )

  useEffect(() => {
    void loadOrganizations().catch((loadError) => {
      const message = loadError instanceof Error ? loadError.message : "Unable to load organizations right now."
      setError(message)
      setLoading(false)
      toast.error(message)
    })
  }, [loadOrganizations])

  useEffect(() => {
    setFormValues((currentValues) => ({
      ...currentValues,
      organizationId: selectedOrganizationId,
    }))
    setEditingMenu(null)
    setPage(1)
    void loadMenus({ nextPage: 1 })
  }, [loadMenus, selectedOrganizationId])

  useEffect(() => {
    function handleOrganizationChange(event: Event) {
      const customEvent = event as CustomEvent<{ organizationId?: string }>
      const organizationId = customEvent.detail?.organizationId || readSelectedOrganizationId()
      setSelectedOrganizationId(organizationId)
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  function resetForm() {
    setEditingMenu(null)
    setFormValues({
      ...EMPTY_FORM,
      organizationId: selectedOrganizationId,
    })
  }

  function startEdit(menu: MenuRecord) {
    setEditingMenu(menu)
    setFormValues({
      organizationId: menu.organizationId,
      menuName: menu.menuName,
      menuPath: menu.menuPath,
      description: menu.description || "",
      displayOrder: menu.displayOrder,
      isActive: menu.isActive,
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      toast.error("Please sign in again to save menu entries.")
      return
    }

    if (!formValues.organizationId) {
      toast.error("Please select an organization before saving a menu entry.")
      return
    }

    if (!formValues.menuName.trim() || !formValues.menuPath.trim()) {
      toast.error("Menu name and path are required.")
      return
    }

    setSaving(true)

    try {
      if (editingMenu) {
        await updateMenu({
          apiUrl,
          accessToken,
          id: editingMenu.id,
          payload: formValues,
        })
        toast.success("Menu entry updated successfully.")
      } else {
        await createMenu({
          apiUrl,
          accessToken,
          payload: formValues,
        })
        toast.success("Menu entry saved successfully.")
      }

      resetForm()
      await loadMenus({ nextPage: 1, silent: true })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save menu entry right now."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(menu: MenuRecord) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      toast.error("Please sign in again to delete menu entries.")
      return
    }

    setDeletingId(menu.id)

    try {
      await deleteMenu({
        apiUrl,
        accessToken,
        id: menu.id,
      })
      toast.success("Menu entry deleted successfully.")
      await loadMenus({ nextPage: page, silent: true })
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete menu entry right now."
      toast.error(message)
    } finally {
      setDeletingId("")
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 text-slate-950 dark:text-white sm:p-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/25">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.36em] text-sky-600 dark:text-sky-300">
              App Config
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              Menu entry
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Create organization-specific menu entries. The selected organization is inherited
              from the workspace combobox, and every saved menu record keeps that organization ID.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => void loadMenus({ nextPage: page, silent: true })}
            disabled={loading}
          >
            <RefreshCcw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <p className="font-semibold">Selected organization</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {selectedOrganization?.name || "No organization selected"}
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[24rem_1fr]">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">
                {editingMenu ? "Edit menu" : "Create menu"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Name, path, order, and active status.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={resetForm}>
              <Plus />
              New
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              Menu name
              <Input
                value={formValues.menuName}
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    menuName: event.target.value,
                  }))
                }
                placeholder="Dashboard"
                className="mt-2 h-10 rounded-xl"
              />
            </label>

            <label className="block text-sm font-semibold">
              Menu path
              <Input
                value={formValues.menuPath}
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    menuPath: event.target.value,
                  }))
                }
                placeholder="/dashboard"
                className="mt-2 h-10 rounded-xl"
              />
            </label>

            <label className="block text-sm font-semibold">
              Display order
              <Input
                type="number"
                min={0}
                value={formValues.displayOrder}
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    displayOrder: Number(event.target.value) || 0,
                  }))
                }
                className="mt-2 h-10 rounded-xl"
              />
            </label>

            <label className="block text-sm font-semibold">
              Description
              <Textarea
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional short description"
                className="mt-2 min-h-24 rounded-xl"
              />
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">
              <Checkbox
                checked={formValues.isActive}
                onCheckedChange={(checked) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    isActive: Boolean(checked),
                  }))
                }
              />
              Active menu entry
            </label>
          </div>

          <Button
            type="submit"
            className="mt-5 h-10 w-full rounded-xl"
            disabled={saving || !selectedOrganizationId}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {editingMenu ? "Update menu" : "Save menu"}
          </Button>
        </form>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Menu entries</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {meta ? `${meta.total} record${meta.total === 1 ? "" : "s"}` : "Organization scoped"}
              </p>
            </div>
            {meta && meta.totalPages > 1 ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-8 text-sm text-slate-500 dark:border-white/10">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading menu entries
              </div>
            ) : menus.length ? (
              menus.map((menu) => (
                <article
                  key={menu.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">{menu.menuName}</h3>
                        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/15 dark:text-slate-300">
                          Order {menu.displayOrder}
                        </span>
                        <span className={menu.isActive ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "rounded-full bg-slate-200 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-600 dark:bg-white/10 dark:text-slate-300"}>
                          {menu.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-sky-700 dark:text-sky-300">
                        {menu.menuPath}
                      </p>
                      {menu.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {menu.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => startEdit(menu)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="rounded-full"
                        disabled={deletingId === menu.id}
                        onClick={() => void handleDelete(menu)}
                      >
                        {deletingId === menu.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
                <p className="font-bold">No menu entries yet.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Create the first menu entry for this organization.
                </p>
              </div>
            )}
          </div>

          {meta && meta.totalPages > 1 ? (
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!meta.hasPreviousPage || loading}
                onClick={() => void loadMenus({ nextPage: Math.max(1, page - 1) })}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!meta.hasNextPage || loading}
                onClick={() => void loadMenus({ nextPage: page + 1 })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
