"use client"

import { useEffect, useRef, useState } from "react"

import { Building2, Plus } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { fetchUserOrganizations } from "@/features/organization/organization.service"
import { OrganizationEntryDialog } from "@/features/organization/organization-entry-dialog"
import type { OrganizationRecord } from "@/features/organization/organization.types"
import { parseStoredAuthUser } from "@/lib/auth-session"
import {
  readSelectedOrganizationId,
  writeSelectedOrganizationId,
} from "@/lib/organization-selection"
import { SelectSeparator } from "./ui/select"

type OrganizationOption = OrganizationRecord & {
  label: string
  value: string
}

type OrganizationComboBoxProps = {
  className?: string
}

let organizationRequirementOwnerId: string | null = null

export function OrganizationComboBox({
  className,
}: OrganizationComboBoxProps) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationOption | null>(null)
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false)
  const [organizationDialogMode, setOrganizationDialogMode] = useState<"create" | "edit">("create")
  const [organizationDialogOrganization, setOrganizationDialogOrganization] =
    useState<OrganizationOption | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const preferredOrganizationIdRef = useRef<string | null>(null)
  const instanceIdRef = useRef<string>(crypto.randomUUID())
  const router = useRouter()
  const pathname = usePathname()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  useEffect(() => {
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
    const userId = storedUser?.id
    const instanceId = instanceIdRef.current

    if (!accessToken || !userId) {
      return
    }

    const authenticatedAccessToken = accessToken
    const authenticatedUserId = userId
    let isMounted = true

    async function loadOrganizations() {
      setIsLoading(true)

      try {
        const nextOrganizations = await fetchUserOrganizations({
          apiUrl,
          accessToken: authenticatedAccessToken,
          userId: authenticatedUserId,
        })
        const nextOrganizationOptions = nextOrganizations.map((organization) => ({
          ...organization,
          label: organization.name,
          value: organization.id,
        }))

        if (isMounted) {
          setOrganizations(nextOrganizationOptions)
          const preferredOrganizationId = preferredOrganizationIdRef.current
          preferredOrganizationIdRef.current = null

          setSelectedOrganization((currentSelectedOrganization) => {
            if (!nextOrganizationOptions.length) {
              return null
            }

            if (preferredOrganizationId) {
              const nextSelectedOrganization = (
                nextOrganizationOptions.find(
                  (organization) => organization.id === preferredOrganizationId,
                ) ?? nextOrganizationOptions.find((organization) => organization.isDefault)
                ?? nextOrganizationOptions[0]
                ?? null
              )
              if (nextSelectedOrganization) {
                writeSelectedOrganizationId(nextSelectedOrganization.id)
              }
              return nextSelectedOrganization
            }

            if (!currentSelectedOrganization) {
              const storedOrganizationId = readSelectedOrganizationId()
              const nextSelectedOrganization = nextOrganizationOptions.find(
                (organization) => organization.id === storedOrganizationId,
              ) ?? nextOrganizationOptions.find((organization) => organization.isDefault)
                ?? nextOrganizationOptions[0]
                ?? null
              if (nextSelectedOrganization) {
                writeSelectedOrganizationId(nextSelectedOrganization.id)
              }
              return nextSelectedOrganization
            }

            const nextSelectedOrganization = (
              nextOrganizationOptions.find(
                (organization) => organization.id === currentSelectedOrganization.id,
              ) ?? nextOrganizationOptions[0] ?? null
            )
            if (nextSelectedOrganization) {
              writeSelectedOrganizationId(nextSelectedOrganization.id)
            }
            return nextSelectedOrganization
          })

          if (!nextOrganizationOptions.length) {
            if (organizationRequirementOwnerId === null || organizationRequirementOwnerId === instanceId) {
              organizationRequirementOwnerId = instanceId
              setOrganizationDialogMode("create")
              setOrganizationDialogOrganization(null)
              setOrganizationDialogOpen(true)

              if (pathname !== "/") {
                router.replace("/")
              }
            }
          }

          if (nextOrganizationOptions.length && organizationRequirementOwnerId === instanceIdRef.current) {
            organizationRequirementOwnerId = null
          }
        }
      } catch {
        if (isMounted) {
          setOrganizations([])
          setSelectedOrganization(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOrganizations()

    return () => {
      isMounted = false

      if (organizationRequirementOwnerId === instanceId) {
        organizationRequirementOwnerId = null
      }
    }
  }, [apiUrl, pathname, reloadKey, router])

  function handleOrganizationSaved(organization: OrganizationRecord) {
    preferredOrganizationIdRef.current = organization.id
    setReloadKey((currentReloadKey) => currentReloadKey + 1)
  }

  function handleOrganizationDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && organizations.length === 0) {
      return
    }

    setOrganizationDialogOpen(nextOpen)
  }

  function handleCreateOrganizationClick() {
    setComboboxOpen(false)
    setOrganizationDialogMode("create")
    setOrganizationDialogOrganization(null)
    setOrganizationDialogOpen(true)
  }

  function handleEditSelectedOrganizationClick() {
    if (!selectedOrganization) {
      return
    }

    setComboboxOpen(false)
    setOrganizationDialogMode("edit")
    setOrganizationDialogOrganization(selectedOrganization)
    setOrganizationDialogOpen(true)
  }

  return (
    <>
      <Combobox
        open={comboboxOpen}
        onOpenChange={setComboboxOpen}
        items={organizations}
        value={selectedOrganization}
        onValueChange={(organization) => {
          setSelectedOrganization(organization)
          if (organization) {
            writeSelectedOrganizationId(organization.id)
          }
        }}
        isItemEqualToValue={(item, value) => item.id === value.id}
      >
        <ComboboxInput
          placeholder={isLoading ? "Loading organizations..." : "Switch organization"}
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
            {isLoading ? "Loading organizations..." : "No organizations available."}
          </ComboboxEmpty>
          <ComboboxList className="px-2 py-2">
            {(item) => (
              <ComboboxItem
                key={item.id}
                value={item}
                className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                <Building2 className="size-3 text-slate-400 dark:text-slate-500" />
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          <SelectSeparator className="my-0 bg-slate-200/80 dark:bg-white/10" />
          <div className="space-y-2 bg-slate-50/80 p-2 dark:bg-white/5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditSelectedOrganizationClick}
              disabled={!selectedOrganization}
              className="h-8 w-full justify-start gap-2 border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Building2 className="size-3" />
              Edit selected organization
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateOrganizationClick}
              className="h-8 w-full justify-start gap-2 border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Plus className="size-3" />
              Create new organization
            </Button>
          </div>
        </ComboboxContent>
      </Combobox>

      <OrganizationEntryDialog
        open={organizationDialogOpen}
        onOpenChange={handleOrganizationDialogOpenChange}
        mode={organizationDialogMode}
        organization={organizationDialogOrganization}
        showLogoutAction={organizations.length === 0 && organizationDialogMode === "create"}
        onSaved={handleOrganizationSaved}
      />
    </>
  )
}
