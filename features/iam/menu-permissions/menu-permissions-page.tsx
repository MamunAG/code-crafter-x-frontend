"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RefreshCcw, Save, Search, ShieldCheck, UsersRound, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchMenus } from "@/features/app-config/menu/menu.service"
import type { MenuRecord } from "@/features/app-config/menu/menu.types"
import type { OrganizationRecord } from "@/features/organization/organization.types"
import { getAuthInitials, parseStoredAuthUser } from "@/lib/auth-session"
import {
  fetchManageableUserMappings,
  fetchMenuOrganizationMaps,
  fetchMenuPermissions,
  saveMenuOrganizationMaps,
  saveMenuPermissions,
} from "./menu-permission.service"
import type {
  ManageableUserMappingRecord,
  MenuPermissionRecord,
  MenuPermissionValue,
  UserOptionRecord,
} from "./menu-permission.types"

type PermissionKey = "canView" | "canCreate" | "canUpdate" | "canDelete"
type MenuFilterMode = "all" | "mapped" | "unmapped"

const PERMISSION_LABELS: Array<{ key: PermissionKey; label: string }> = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canUpdate", label: "Update" },
  { key: "canDelete", label: "Delete" },
]

function getUserLabel(user: UserOptionRecord) {
  return user.name || user.user_name || user.email || "User"
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
  const [users, setUsers] = useState<UserOptionRecord[]>([])
  const [manageableMappings, setManageableMappings] = useState<ManageableUserMappingRecord[]>([])
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([])
  const [menus, setMenus] = useState<MenuRecord[]>([])
  const [mappedMenuIds, setMappedMenuIds] = useState<string[]>([])
  const [permissions, setPermissions] = useState<MenuPermissionValue[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [menuSearch, setMenuSearch] = useState("")
  const [menuFilterMode, setMenuFilterMode] = useState<MenuFilterMode>("all")
  const [userComboboxOpen, setUserComboboxOpen] = useState(false)
  const menusRef = useRef<MenuRecord[]>([])
  const manageableMappingsRef = useRef<ManageableUserMappingRecord[]>([])

  useEffect(() => {
    menusRef.current = menus
  }, [menus])

  useEffect(() => {
    manageableMappingsRef.current = manageableMappings
  }, [manageableMappings])

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  )

  const mappedMenuIdSet = useMemo(() => new Set(mappedMenuIds), [mappedMenuIds])

  const permissionByMenuId = useMemo(
    () => new Map(permissions.map((permission) => [permission.menuId, permission])),
    [permissions],
  )

  const filteredMenus = useMemo(() => {
    const normalizedSearch = menuSearch.trim().toLowerCase()

    return menus.filter((menu) => {
      const isMapped = mappedMenuIdSet.has(menu.id)
      const matchesMode =
        menuFilterMode === "all"
        || (menuFilterMode === "mapped" && isMapped)
        || (menuFilterMode === "unmapped" && !isMapped)
        const matchesSearch =
          !normalizedSearch
          || menu.menuName.toLowerCase().includes(normalizedSearch)
          || menu.menuPath?.toLowerCase().includes(normalizedSearch)
          || menu.description?.toLowerCase().includes(normalizedSearch)

      return matchesMode && matchesSearch
    })
  }, [mappedMenuIdSet, menuFilterMode, menuSearch, menus])

  const hasMenuFilters = Boolean(menuSearch.trim() || menuFilterMode !== "all")

  const loadOrganizationAccess = useCallback(async (userId: string, organizationId: string, nextMenus?: MenuRecord[]) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const accessToken = window.localStorage.getItem("access_token")
      const menuList = nextMenus ?? menusRef.current

      if (!apiUrl || !accessToken || !userId || !organizationId) {
        setMappedMenuIds([])
        setPermissions(buildDefaultPermissions(menuList, []))
        return
      }

      setLoading(true)
      setError("")

      try {
        const [menuMaps, existingPermissions] = await Promise.all([
          fetchMenuOrganizationMaps({
            apiUrl,
            accessToken,
            organizationId,
          }),
          fetchMenuPermissions({
            apiUrl,
            accessToken,
            userId,
            organizationId,
          }),
        ])

        setMappedMenuIds(menuMaps.map((mapping) => mapping.menuId))
        setPermissions(buildDefaultPermissions(menuList, existingPermissions))
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load menu access."
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }, [])

  const loadUserOrganizations = useCallback(
    async (
      userId: string,
      sourceMappings: ManageableUserMappingRecord[],
      preferredOrganizationId?: string,
      nextMenus?: MenuRecord[],
    ) => {
      const menuList = nextMenus ?? menusRef.current

      if (!userId) {
        setOrganizations([])
        setSelectedOrganizationId("")
        setMappedMenuIds([])
        setPermissions(buildDefaultPermissions(menuList, []))
        return
      }

      setLoading(true)
      setError("")

      try {
        const userOrganizations = sourceMappings
          .filter((mapping) => mapping.userId === userId)
          .map((mapping) => ({
            ...mapping.organization,
            isDefault: mapping.isDefault,
          }))
        const nextOrganization =
          userOrganizations.find((organization) => organization.id === preferredOrganizationId)
          ?? userOrganizations.find((organization) => organization.isDefault)
          ?? userOrganizations[0]
          ?? null

        setOrganizations(userOrganizations)
        setSelectedOrganizationId(nextOrganization?.id ?? "")

        if (nextOrganization) {
          await loadOrganizationAccess(userId, nextOrganization.id, nextMenus)
        } else {
          setMappedMenuIds([])
          setPermissions(buildDefaultPermissions(menuList, []))
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load user organizations."
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    },
    [loadOrganizationAccess],
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

    setLoading(true)
    setError("")

    try {
      const [nextUsers, menuResult] = await Promise.all([
        fetchManageableUserMappings({
          apiUrl,
          accessToken,
        }),
        fetchMenus({
          apiUrl,
          accessToken,
          page: 1,
          limit: 100,
        }),
      ])
      const editableMappings = nextUsers.filter((mapping) => mapping.userId !== storedUser.id)
      const userById = new Map<string, UserOptionRecord>()

      for (const mapping of editableMappings) {
        if (mapping.user && !userById.has(mapping.userId)) {
          userById.set(mapping.userId, {
            ...mapping.user,
            role: mapping.role,
          })
        }
      }

      const editableUsers = [...userById.values()]
      const nextUserId = editableUsers[0]?.id ?? ""

      setManageableMappings(editableMappings)
      setUsers(editableUsers)
      setMenus(menuResult.items)
      setSelectedUserId(nextUserId)

      if (nextUserId) {
        await loadUserOrganizations(nextUserId, editableMappings, undefined, menuResult.items)
      } else {
        setOrganizations([])
        setMappedMenuIds([])
        setPermissions(buildDefaultPermissions(menuResult.items, []))
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load menu permissions right now."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [loadUserOrganizations])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadWorkspace()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [loadWorkspace])

  async function handleUserChange(userId: string) {
    setSelectedUserId(userId)
    await loadUserOrganizations(userId, manageableMappingsRef.current)
  }

  async function handleOrganizationChange(organizationId: string) {
    setSelectedOrganizationId(organizationId)
    await loadOrganizationAccess(selectedUserId, organizationId)
  }

  function toggleMapping(menuId: string, value: boolean) {
    setMappedMenuIds((currentMenuIds) => {
      if (value) {
        return currentMenuIds.includes(menuId) ? currentMenuIds : [...currentMenuIds, menuId]
      }

      return currentMenuIds.filter((currentMenuId) => currentMenuId !== menuId)
    })

    if (!value) {
      setPermissions((currentPermissions) =>
        currentPermissions.map((permission) =>
          permission.menuId === menuId
            ? {
                ...permission,
                canView: false,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
              }
            : permission,
        ),
      )
    }
  }

  function togglePermission(menuId: string, key: PermissionKey, value: boolean) {
    if (!mappedMenuIdSet.has(menuId)) {
      return
    }

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

  function resetMenuFilters() {
    setMenuSearch("")
    setMenuFilterMode("all")
  }

  async function handleSave() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      toast.error("Please sign in again to save menu access.")
      return
    }

    if (!selectedUserId || !selectedOrganizationId) {
      toast.error("Select a user and organization before saving menu access.")
      return
    }

    setSaving(true)

    try {
      const nextMappedMenuIds = [...new Set(mappedMenuIds)]
      await saveMenuOrganizationMaps({
        apiUrl,
        accessToken,
        organizationId: selectedOrganizationId,
        menuIds: nextMappedMenuIds,
      })

      const savedPermissions = await saveMenuPermissions({
        apiUrl,
        accessToken,
        userId: selectedUserId,
        organizationId: selectedOrganizationId,
        permissions: permissions.filter((permission) => nextMappedMenuIds.includes(permission.menuId)),
      })

      setMappedMenuIds(nextMappedMenuIds)
      setPermissions(buildDefaultPermissions(menus, savedPermissions))
      toast.success("Menu access saved successfully.")
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save menu access right now."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 text-slate-950 dark:text-white sm:p-6">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-2xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/75 dark:shadow-black/25">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-violet-600 dark:text-violet-300">
              IAM Access
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              User menu access
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Select a user first, choose one of their organizations, map the available menus to
              that organization, then grant the user view, create, update, and delete access.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => void loadWorkspace()}
            disabled={loading}
          >
            <RefreshCcw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              User
            </p>
            <Combobox
              open={userComboboxOpen}
              onOpenChange={setUserComboboxOpen}
              items={users}
              value={selectedUser}
              onValueChange={(user) => {
                setUserComboboxOpen(false)
                if (user) {
                  void handleUserChange(user.id)
                }
              }}
              isItemEqualToValue={(item, value) => item.id === value.id}
            >
              <ComboboxInput
                placeholder={loading ? "Loading users..." : "Search users"}
                disabled={loading || users.length === 0}
                className="mt-2 w-full text-xs"
              />
              <ComboboxContent className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
                <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    User
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    Search and choose a user to load their organizations.
                  </p>
                </div>
                <ComboboxEmpty className="py-5 text-xs">
                  {loading ? "Loading users..." : "No users available."}
                </ComboboxEmpty>
                <ComboboxList className="px-2 py-2">
                  {(user) => (
                    <ComboboxItem
                      key={user.id}
                      value={user}
                      className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <UsersRound className="size-3 text-slate-400 dark:text-slate-500" />
                      {getUserLabel(user)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Organization
            </p>
            <Select
              value={selectedOrganizationId}
              onValueChange={(value) => void handleOrganizationChange(value)}
              disabled={!selectedUserId || organizations.length === 0}
            >
              <SelectTrigger className="mt-2 h-10 w-full rounded-xl bg-white dark:bg-slate-950">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
            <p className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4" />
              Org scoped
            </p>
            <p className="mt-1 text-xs leading-5">
              Saved access applies only to this user and organization.
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
              {selectedUser ? getUserLabel(selectedUser) : "No user"} in{" "}
              {selectedOrganization?.name || "no organization"} has {mappedMenuIds.length} mapped
              menu{mappedMenuIds.length === 1 ? "" : "s"}.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-full"
            disabled={saving || loading || !selectedUserId || !selectedOrganizationId}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save access
          </Button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                placeholder="Search menu by name, path, or description"
                className="h-11 rounded-xl bg-white pl-9 dark:bg-slate-950"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "mapped", "unmapped"] as MenuFilterMode[]).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={menuFilterMode === mode ? "default" : "outline"}
                  className="h-10 rounded-full capitalize"
                  onClick={() => setMenuFilterMode(mode)}
                >
                  {mode}
                </Button>
              ))}
              {hasMenuFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-full"
                  onClick={resetMenuFilters}
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">
              Showing {filteredMenus.length} of {menus.length}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              {mappedMenuIds.length} mapped
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {Math.max(menus.length - mappedMenuIds.length, 0)} unmapped
            </Badge>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-8 text-sm text-slate-500 dark:border-white/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading menu access
            </div>
          ) : !users.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
              <p className="font-bold">No users available.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Add another user before assigning menu access.
              </p>
            </div>
          ) : !organizations.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
              <p className="font-bold">This user has no organizations.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Map the user to an organization before assigning menu access.
              </p>
            </div>
          ) : !menus.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
              <p className="font-bold">No menu entries found.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Create menu entries under App Config before assigning permissions.
              </p>
            </div>
          ) : !filteredMenus.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
              <p className="font-bold">No menu matches your search.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Try another name/path or clear the menu filters.
              </p>
              <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={resetMenuFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            filteredMenus.map((menu) => {
              const permission = permissionByMenuId.get(menu.id)
              const isMapped = mappedMenuIdSet.has(menu.id)

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
                            {menu.menuPath || "No path set"}
                          </p>
                      </div>
                    </div>
                    {menu.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {menu.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100">
                      <Checkbox
                        checked={isMapped}
                        onCheckedChange={(checked) => toggleMapping(menu.id, Boolean(checked))}
                      />
                      Map
                    </label>
                    {PERMISSION_LABELS.map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-slate-950"
                      >
                        <Checkbox
                          checked={Boolean(permission?.[item.key])}
                          disabled={!isMapped}
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
    </ScrollArea>
  )
}
