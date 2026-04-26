"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCcw, ShieldCheck, UserMinus, UsersRound } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  fetchOrganizationMemberships,
  fetchUserOrganizationMappings,
  revokeOrganizationAccess,
  updateOrganizationMemberRole,
} from "@/features/organization/organization.service"
import type { OrganizationMembershipRecord, OrganizationRecord } from "@/features/organization/organization.types"
import { getAuthInitials, parseStoredAuthUser } from "@/lib/auth-session"

type OrganizationMembersGroup = {
  organization: OrganizationRecord
  memberships: OrganizationMembershipRecord[]
}

type RevokeTarget = {
  membership: OrganizationMembershipRecord
  organization: OrganizationRecord
}

function getMemberLabel(membership: OrganizationMembershipRecord) {
  return membership.user?.name || membership.user?.user_name || membership.user?.email || "User"
}

function getMemberEmail(membership: OrganizationMembershipRecord) {
  return membership.user?.email || "No email available"
}

export function UserDirectoryPage() {
  const [groups, setGroups] = useState<OrganizationMembersGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [roleChangingKey, setRoleChangingKey] = useState("")
  const [currentUserId, setCurrentUserId] = useState("")

  const totalMembers = useMemo(
    () => groups.reduce((total, group) => total + group.memberships.length, 0),
    [groups],
  )

  const loadDirectory = useCallback(async ({ silent = false } = {}) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))

    if (!apiUrl || !accessToken || !storedUser?.id) {
      setError("Please sign in again to manage organization members.")
      setLoading(false)
      return
    }

    setCurrentUserId(storedUser.id)
    setError("")
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const ownMemberships = await fetchUserOrganizationMappings({
        apiUrl,
        accessToken,
        userId: storedUser.id,
      })
      const adminMemberships = ownMemberships.filter((membership) => membership.role === "admin")

      const memberGroups = await Promise.all(
        adminMemberships.map(async (membership) => ({
          organization: membership.organization,
          memberships: await fetchOrganizationMemberships({
            apiUrl,
            accessToken,
            organizationId: membership.organizationId,
          }),
        })),
      )

      setGroups(memberGroups)
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load organization members right now."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDirectory()
  }, [loadDirectory])

  async function handleRevokeAccess() {
    if (!revokeTarget || revoking) {
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      toast.error("Please sign in again to revoke organization access.")
      return
    }

    setRevoking(true)

    try {
      await revokeOrganizationAccess({
        apiUrl,
        accessToken,
        userId: revokeTarget.membership.userId,
        organizationId: revokeTarget.organization.id,
      })
      toast.success(`${getMemberLabel(revokeTarget.membership)} no longer has access to ${revokeTarget.organization.name}.`)
      setRevokeTarget(null)
      await loadDirectory({ silent: true })
    } catch (revokeError) {
      const message =
        revokeError instanceof Error
          ? revokeError.message
          : "Unable to revoke organization access right now."
      toast.error(message)
    } finally {
      setRevoking(false)
    }
  }

  async function handleRoleChange(
    membership: OrganizationMembershipRecord,
    organization: OrganizationRecord,
    role: "admin" | "user",
  ) {
    if (membership.role === role) {
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const accessToken = window.localStorage.getItem("access_token")

    if (!apiUrl || !accessToken) {
      toast.error("Please sign in again to update organization roles.")
      return
    }

    const membershipKey = `${membership.organizationId}-${membership.userId}`
    setRoleChangingKey(membershipKey)

    try {
      const updatedMembership = await updateOrganizationMemberRole({
        apiUrl,
        accessToken,
        userId: membership.userId,
        organizationId: organization.id,
        role,
      })

      setGroups((currentGroups) =>
        currentGroups.map((group) =>
          group.organization.id === organization.id
            ? {
                ...group,
                memberships: group.memberships.map((item) =>
                  item.userId === membership.userId && item.organizationId === membership.organizationId
                    ? {
                        ...item,
                        role: updatedMembership.role,
                      }
                    : item,
                ),
              }
            : group,
        ),
      )
      toast.success(`${getMemberLabel(membership)} is now ${role} in ${organization.name}.`)
    } catch (roleError) {
      const message =
        roleError instanceof Error
          ? roleError.message
          : "Unable to update the member role right now."
      toast.error(message)
    } finally {
      setRoleChangingKey("")
    }
  }

  return (
    <div className="py-8 text-slate-950 dark:text-white">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/78 dark:shadow-black/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.42em] text-slate-500 dark:text-slate-400">
              User Directory
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Manage organization access
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Review members in organizations where you are an admin. Change roles when responsibility
              shifts, or revoke access when a user should no longer be mapped to that organization.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => void loadDirectory({ silent: true })}
            disabled={loading || refreshing}
          >
            <RefreshCcw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Admin orgs
            </p>
            <p className="mt-2 text-3xl font-black">{groups.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Visible members
            </p>
            <p className="mt-2 text-3xl font-black">{totalMembers}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Permission
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Admin-managed only
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="mt-6 flex min-h-48 items-center justify-center rounded-[1.75rem] border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/78">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading user directory
          </div>
        </section>
      ) : error ? (
        <section className="mt-6 rounded-[1.75rem] border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          <p className="font-bold">Unable to load user directory</p>
          <p className="mt-2 text-sm leading-6">{error}</p>
        </section>
      ) : groups.length === 0 ? (
        <section className="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-8 dark:border-white/10 dark:bg-slate-950/78">
          <UsersRound className="h-8 w-8 text-slate-400" />
          <p className="mt-4 text-lg font-bold">No admin organizations found.</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            You can revoke access only in organizations where you already have the Admin role.
          </p>
        </section>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map((group) => (
            <section
              key={group.organization.id}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-slate-950/78 dark:shadow-black/20"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Organization
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{group.organization.name}</h2>
                </div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {group.memberships.length} member{group.memberships.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {group.memberships.map((membership) => {
                  const isCurrentUser = membership.userId === currentUserId
                  const membershipKey = `${membership.organizationId}-${membership.userId}`
                  const roleChanging = roleChangingKey === membershipKey

                  return (
                    <div
                      key={`${membership.organizationId}-${membership.userId}`}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                          {getAuthInitials(getMemberLabel(membership))}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{getMemberLabel(membership)}</p>
                            {isCurrentUser ? (
                              <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:border-white/15 dark:text-slate-300">
                                You
                              </span>
                            ) : null}
                            <span className="rounded-full border border-violet-300/70 bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200">
                              {membership.role}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {getMemberEmail(membership)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select
                          value={membership.role}
                          disabled={isCurrentUser || roleChanging}
                          onValueChange={(value) =>
                            void handleRoleChange(
                              membership,
                              group.organization,
                              value as "admin" | "user",
                            )
                          }
                        >
                          <SelectTrigger className="h-9 min-w-28 rounded-full border-slate-300 bg-white px-3 text-sm font-semibold dark:border-white/15 dark:bg-slate-950">
                            {roleChanging ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Saving
                              </span>
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="destructive"
                          className="rounded-full"
                          disabled={isCurrentUser || roleChanging}
                          onClick={() => setRevokeTarget({ membership, organization: group.organization })}
                        >
                          <UserMinus />
                          Revoke access
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke organization access?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget
                ? `${getMemberLabel(revokeTarget.membership)} will lose access to ${revokeTarget.organization.name}. They will need a new approval before using this organization again.`
                : "This user will lose access to the selected organization."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={revoking}
              onClick={(event) => {
                event.preventDefault()
                void handleRevokeAccess()
              }}
            >
              {revoking ? <Loader2 className="animate-spin" /> : <UserMinus />}
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
