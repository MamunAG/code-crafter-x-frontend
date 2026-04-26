"use client"

import { useEffect, useMemo, useState } from "react"

import { CheckCircle2, Loader2, RefreshCcw, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { parseStoredAuthUser } from "@/lib/auth-session"
import { fetchUserOrganizationMappings } from "@/features/organization/organization.service"

import {
  approveOrganizationAccessRequest,
  fetchPendingOrganizationAccessRequests,
  rejectOrganizationAccessRequest,
} from "./organization-access-request.service"
import type {
  OrganizationAccessRequestAssignment,
  OrganizationAccessRequestRecord,
} from "./organization-access-request.types"
import type { OrganizationMembershipRecord } from "@/features/organization/organization.types"

export function OrganizationAccessRequestAdminPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<OrganizationAccessRequestRecord[]>([])
  const [adminMemberships, setAdminMemberships] = useState<OrganizationMembershipRecord[]>([])
  const [adminAssignments, setAdminAssignments] = useState<Record<string, OrganizationAccessRequestAssignment[]>>({})
  const [organizationIds, setOrganizationIds] = useState<string[]>([])
  const [isSubmittingRequestId, setIsSubmittingRequestId] = useState<string | null>(null)

  const adminOrganizationMap = useMemo(() => {
    return new Map(adminMemberships.map((membership) => [membership.organizationId, membership.organization.name]))
  }, [adminMemberships])

  useEffect(() => {
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
    const userId = storedUser?.id

    if (!accessToken || !userId) {
      return
    }

    const authenticatedAccessToken = accessToken
    const authenticatedUserId = userId
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      setIsRefreshing(true)

      try {
        const [nextRequests, nextMemberships] = await Promise.all([
          fetchPendingOrganizationAccessRequests({
            apiUrl,
            accessToken: authenticatedAccessToken,
          }),
          fetchUserOrganizationMappings({
            apiUrl,
            accessToken: authenticatedAccessToken,
            userId: authenticatedUserId,
          }),
        ])

        const nextAdminMemberships = nextMemberships.filter((membership) => membership.role === "admin")
        const nextAdminOrganizationIds = nextAdminMemberships.map((membership) => membership.organizationId)

        if (isMounted) {
          setPendingRequests(nextRequests)
          setAdminMemberships(nextAdminMemberships)
          setOrganizationIds(nextAdminOrganizationIds)
          setAdminAssignments((currentAssignments) => {
            const nextAssignments = { ...currentAssignments }

            for (const request of nextRequests) {
              if (!nextAssignments[request.id]) {
                nextAssignments[request.id] = []
              }
            }

            return nextAssignments
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load access requests right now."
        toast.error(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [apiUrl])

  function toggleAssignment(requestId: string, organizationId: string, enabled: boolean) {
    setAdminAssignments((currentAssignments) => {
      const current = currentAssignments[requestId] ?? []
      const next = enabled
        ? current.some((assignment) => assignment.organizationId === organizationId)
          ? current
          : [...current, { organizationId, role: "user" as const }]
        : current.filter((assignment) => assignment.organizationId !== organizationId)

      return {
        ...currentAssignments,
        [requestId]: next,
      }
    })
  }

  function updateAssignmentRole(requestId: string, organizationId: string, role: "admin" | "user") {
    setAdminAssignments((currentAssignments) => {
      const current = currentAssignments[requestId] ?? []

      return {
        ...currentAssignments,
        [requestId]: current.map((assignment) =>
          assignment.organizationId === organizationId ? { ...assignment, role } : assignment,
        ),
      }
    })
  }

  async function handleApprove(request: OrganizationAccessRequestRecord) {
    const accessToken = window.localStorage.getItem("access_token")

    if (!accessToken) {
      toast.error("Please sign in again to review requests.")
      return
    }

    const assignments = adminAssignments[request.id] ?? []

    if (!assignments.length) {
      toast.error("Select at least one organization before approving this request.")
      return
    }

    setIsSubmittingRequestId(request.id)

    try {
      await approveOrganizationAccessRequest({
        apiUrl,
        accessToken,
        requestId: request.id,
        assignments,
      })

      toast.success("Access request approved successfully.")
      setPendingRequests((currentRequests) => currentRequests.filter((item) => item.id !== request.id))
      setAdminAssignments((currentAssignments) => {
        const nextAssignments = { ...currentAssignments }
        delete nextAssignments[request.id]
        return nextAssignments
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to approve the request right now."
      toast.error(message)
    } finally {
      setIsSubmittingRequestId(null)
    }
  }

  async function handleReject(request: OrganizationAccessRequestRecord) {
    const accessToken = window.localStorage.getItem("access_token")

    if (!accessToken) {
      toast.error("Please sign in again to review requests.")
      return
    }

    setIsSubmittingRequestId(request.id)

    try {
      await rejectOrganizationAccessRequest({
        apiUrl,
        accessToken,
        requestId: request.id,
      })

      toast.success("Access request rejected.")
      setPendingRequests((currentRequests) => currentRequests.filter((item) => item.id !== request.id))
      setAdminAssignments((currentAssignments) => {
        const nextAssignments = { ...currentAssignments }
        delete nextAssignments[request.id]
        return nextAssignments
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reject the request right now."
      toast.error(message)
    } finally {
      setIsSubmittingRequestId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-3 py-4 sm:px-4 sm:py-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Organization access requests
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Review pending requests and grant membership
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Approve or reject requests from the IAM access queue. You can assign the requester to
              one or multiple organizations and set the role for each assignment.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-xl"
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
            Refresh
          </Button>
        </div>
      </section>

      {!organizationIds.length ? (
        <Card className="border-slate-200/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              You do not currently administer any organizations.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Requests will appear here once you have an admin role in at least one organization.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 pb-6">
          {pendingRequests.length ? (
            pendingRequests.map((request) => {
              const selectedAssignments = adminAssignments[request.id] ?? []
              const selectedOrganizationIds = new Set(
                selectedAssignments.map((assignment) => assignment.organizationId),
              )

              return (
                <Card
                  key={request.id}
                  className="border-slate-200/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                          {request.requestedByUser.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                          {request.requestedByUser.email}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                      >
                        {request.status}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Requested admin email
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {request.requestedAdminEmail}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {request.requestedAdminUser?.name || "Admin account"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Request note
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {request.message || "No message provided."}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Assign organizations
                      </p>

                      {!organizationIds.length ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No admin organizations available.
                        </p>
                      ) : null}

                      {organizationIds.map((organizationId) => {
                        const selectedAssignment = selectedAssignments.find(
                          (assignment) => assignment.organizationId === organizationId,
                        )

                        return (
                          <div
                            key={organizationId}
                            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
                          >
                            <Checkbox
                              checked={selectedOrganizationIds.has(organizationId)}
                              onCheckedChange={(checked) =>
                                toggleAssignment(request.id, organizationId, Boolean(checked))
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {adminOrganizationMap.get(organizationId) || organizationId}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Grant membership in this organization
                              </p>
                            </div>
                            {selectedAssignment ? (
                              <Select
                                value={selectedAssignment.role}
                                onValueChange={(value) =>
                                  updateAssignmentRole(
                                    request.id,
                                    organizationId,
                                    value as "admin" | "user",
                                  )
                                }
                              >
                                <SelectTrigger className="h-9 w-32 rounded-xl">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>

                    <Separator className="bg-slate-200 dark:bg-white/10" />

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => handleApprove(request)}
                        disabled={isSubmittingRequestId === request.id}
                        className="rounded-xl"
                      >
                        {isSubmittingRequestId === request.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleReject(request)}
                        disabled={isSubmittingRequestId === request.id}
                        className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-slate-200/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  No pending organization access requests.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Requests submitted by users will show up here once they ask for access.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
