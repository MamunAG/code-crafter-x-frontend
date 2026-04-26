"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCcw, Save, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchMenus } from "@/features/app-config/menu/menu.service"
import type { MenuRecord } from "@/features/app-config/menu/menu.types"
import {
  fetchOrganizationMemberships,
  fetchUserOrganizations,
} from "@/features/organization/organization.service"
import type { OrganizationMembershipRecord, OrganizationRecord } from "@/features/organization/organization.types"
import { getAuthInitials, parseStoredAuthUser } from "@/lib/auth-session"
import {
  readSelectedOrganizationId,
  SELECTED_ORGANIZATION_CHANGED_EVENT,
  writeSelectedOrganizationId,
} from "@/lib/organization-selection"
import { fetchMenuPermissions, saveMenuPermissions } from "./menu-permission.service"
import type { MenuPermissionRecord, MenuPermissionValue } from "./menu-permission.types"

type PermissionKey = "canView" | "canCreate" | "canUpdate" | "canDelete"

const PERMISSION_LABELS: Array<{ key: PermissionKey; label: string }> = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canUpdate", label: "Update" },
  { key: "canDelete", label: "Delete" },
]

function getMemberLabel(membership: OrganizationMembershipRecord) {
  return membership.user?.name || membership.user?.user_name || membership.user?.email || "User"
}

function buildDefaultPermissions(menus: MenuRecord[], records: MenuPermissionRecord[]) {
  const permissionByMenuId = new Map(records.map((record) => [record.menuId, record]))

  return menus.map((menu) => {
    const record = permissionByMenuId.get(menu.id)

    return {
      menuId: menu.id,
      canView: Boolean(record?.canView),
      canCreate: Boolean(record?.canCreate),
      canUpdate: Boolean(record?.canUpdate),
      canDelete: Boolean(record?.canDelete),
    }
  })
}

export function MenuPermissionsPage() {
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([])
  const [memberships, setMemberships] = useState<OrganizationMembershipRecord[]>([])
  const [menus, setMenus] = useState<MenuRecord[]>([])
  const [permissions, setPermissions] = useState<MenuPermissionValue[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  )

  const editableMemberships = useMemo(
    () => memberships.filter((membership) => membership.userId !== currentUserId),
    [currentUserId, memberships],
  )

  const permissionByMenuId = useMemo(
    () => new Map(permissions.map((permission) => [permission.menuId, permission])),
    [permissions],
  )

  const loadWorkspace = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))

    if (!apiUrl || !accessToken || !storedUser?.id) {
      setError("Please sign in again to manage menu permissions.")
      setLoading(false)
      return
    }

    setCurrentUserId(storedUser.id)
    setLoading(true)
    setError("")

    try {
      const userOrganizations = await fetchUserOrganizations({
        apiUrl,
        accessToken,
        userId: storedUser.id,
      })
      const storedOrganizationId = readSelectedOrganizationId()
      const nextOrganization =
        userOrganizations.find((organization) => organization.id === storedOrganizationId)
        ?? userOrganizations.find((organization) => organization.isDefault)
        ?? userOrganizations[0]
        ?? null

      setOrganizations(userOrganizations)

      if (nextOrganization) {
        setSelectedOrganizationId(nextOrganization.id)
        writeSelectedOrganizationId(nextOrganization.id)
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load organizations right now."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOrganizationData = useCallback(
    async (organizationId: string, preferredUserId?: string) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const accessToken = window.localStorage.getItem("access_token")

      if (!apiUrl || !accessToken || !organizationId) {
        setMemberships([])
        setMenus([])
        setPermissions([])
        return
      }

      setLoading(true)
      setError("")

      try {
        const [nextMemberships, menuResult] = await Promise.all([
          fetchOrganizationMemberships({
            apiUrl,
            accessToken,
            organizationId,
          }),
          fetchMenus({
            apiUrl,
            accessToken,
            organizationId,
            page: 1,
            limit: 100,
          }),
        ])
        const nextEditableMemberships = nextMemberships.filter((membership) => membership.userId !== currentUserId)
        const nextSelectedUserId =
          nextEditableMemberships.find((membership) => membership.userId === preferredUserId)?.userId
          ?? nextEditableMemberships[0]?.userId
          ?? ""

        setMemberships(nextMemberships)
        setMenus(menuResult.items)
        setSelectedUserId(nextSelectedUserId)

        if (nextSelectedUserId) {
          const existingPermissions = await fetchMenuPermissions({
            apiUrl,
            accessToken,
            organizationId,
            userId: nextSelectedUserId,
          })
          setPermissions(buildDefaultPermissions(menuResult.items, existingPermissions))
        } else {
          setPermissions(buildDefaultPermissions(menuResult.items, []))
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load menu permissions right now."
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    },
    [currentUserId],
  )

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    if (selectedOrganizationId) {
      void loadOrganizationData(selectedOrganizationId, selectedUserId)
    }
  }, [loadOrganizationData, selectedOrganizationId])

  useEffect(() => {
    function handleOrganizationChange(event: Event) {
      const customEvent = event as CustomEvent<{ organizationId?: string }>
      const organizationId = customEvent.detail?.organizationId || readSelectedOrganizationId()
      setSelectedOrganizationId(organizationId)
    }

    window.addEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
    return () => window.removeEventListener(SELECTED_ORGANIZATION_CHANGED_EVENT, handleOrganizationChange)
  }, [])

  async function handleUserChange(userId: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    setSelectedUserId(userId)

    if (!apiUrl || !accessToken || !selectedOrganizationId || !userId) {
      setPermissions(buildDefaultPermissions(menus, []))
      return
    }

    try {
      const existingPermissions = await fetchMenuPermissions({
        apiUrl,
        accessToken,
        organizationId: selectedOrganizationId,
        userId,
      })
      setPermissions(buildDefaultPermissions(menus, existingPermissions))
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load user menu permissions."
      toast.error(message)
    }
  }

  function togglePermission(menuId: string, key: PermissionKey, value: boolean) {
    setPermissions((currentPermissions) =>
      currentPermissions.map((permission) =>
        permission.menuId === menuId
          ? {
              ...permission,
              [key]: value,
              canView: key !== "canView" && value ? true : key === "canView" ? value : permission.canView,
            }
          : permission,
      ),
    )
  }

  async function handleSave() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      toast.error("Please sign in again to save menu permissions.")
      return
    }

    if (!selectedOrganizationId || !selectedUserId) {
      toast.error("Select an organization and user before saving permissions.")
      return
    }

    setSaving(true)

    try {
      const savedPermissions = await saveMenuPermissions({
        apiUrl,
        accessToken,
        organizationId: selectedOrganizationId,
        userId: selectedUserId,
        permissions,
      })
      setPermissions(buildDefaultPermissions(menus, savedPermissions))
      toast.success("Menu permissions saved successfully.")
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save menu permissions right now."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 text-slate-950 dark:text-white sm:p-6">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-2xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/75 dark:shadow-black/25">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-violet-600 dark:text-violet-300">
              IAM Access
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              Menu permissions
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Organization admins can grant view, create, update, and delete permissions for each
              App Config menu entry to other users in the same organization.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => void loadOrganizationData(selectedOrganizationId, selectedUserId)}
            disabled={loading || !selectedOrganizationId}
          >
            <RefreshCcw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Organization
            </p>
            <p className="mt-2 font-semibold">{selectedOrganization?.name || "No organization selected"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              User
            </p>
            <Select value={selectedUserId} onValueChange={(value) => void handleUserChange(value)}>
              <SelectTrigger className="mt-2 h-10 w-full rounded-xl bg-white dark:bg-slate-950">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {editableMemberships.map((membership) => (
                  <SelectItem key={membership.userId} value={membership.userId}>
                    {getMemberLabel(membership)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
            <p className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4" />
              Admin managed
            </p>
            <p className="mt-1 text-xs leading-5">
              Only organization admins can change these permissions.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          {error}
        </section>
      ) : null}

      <section className="mt-5 rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/75 dark:shadow-black/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Menu access matrix</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {menus.length} menu{menus.length === 1 ? "" : "s"} available for this organization.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-full"
            disabled={saving || loading || !selectedUserId || menus.length === 0}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save permissions
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-8 text-sm text-slate-500 dark:border-white/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading permissions
            </div>
          ) : !editableMemberships.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
              <p className="font-bold">No users available.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Add another user to this organization before assigning menu permissions.
              </p>
            </div>
          ) : !menus.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
              <p className="font-bold">No menu entries found.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Create menu entries under App Config before assigning permissions.
              </p>
            </div>
          ) : (
            menus.map((menu) => {
              const permission = permissionByMenuId.get(menu.id)

              return (
                <article
                  key={menu.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 lg:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                        {getAuthInitials(menu.menuName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-black">{menu.menuName}</h3>
                        <p className="truncate font-mono text-xs text-violet-700 dark:text-violet-300">
                          {menu.menuPath}
                        </p>
                      </div>
                    </div>
                    {menu.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {menu.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PERMISSION_LABELS.map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-slate-950"
                      >
                        <Checkbox
                          checked={Boolean(permission?.[item.key])}
                          onCheckedChange={(checked) =>
                            togglePermission(menu.id, item.key, Boolean(checked))
                          }
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
