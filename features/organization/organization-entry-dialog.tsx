"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Loader2, LogOut } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  clearAuthSessionCookie,
  clearAuthUserAvatarCookie,
  clearAuthUserLabelCookie,
  clearStoredAuthSession,
  parseStoredAuthUser,
} from "@/lib/auth-session"

import {
  createOrganization,
  updateOrganization,
  updateOrganizationDefault,
} from "./organization.service"
import type { OrganizationFormValues, OrganizationRecord } from "./organization.types"

type OrganizationEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  organization?: OrganizationRecord | null
  onSaved?: (organization: OrganizationRecord) => void
  showLogoutAction?: boolean
}

const DEFAULT_VALUES: OrganizationFormValues = {
  name: "",
  address: "",
  contact: "",
  isDefault: false,
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-[11px] leading-5 text-red-600 dark:text-red-300">{message}</p>
}

export function OrganizationEntryDialog({
  open,
  onOpenChange,
  mode = "create",
  organization = null,
  onSaved,
  showLogoutAction = false,
}: OrganizationEntryDialogProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    clearErrors,
    reset,
  } = useForm<OrganizationFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: "onSubmit",
    reValidateMode: "onChange",
  })

  const isEditMode = mode === "edit"

  useEffect(() => {
    if (!open) {
      return
    }

    reset(
      isEditMode && organization
        ? {
            name: organization.name ?? "",
            address: organization.address ?? "",
            contact: organization.contact ?? "",
            isDefault: Boolean(organization.isDefault),
          }
        : DEFAULT_VALUES,
    )
    clearErrors()
  }, [clearErrors, isEditMode, open, organization, reset])

  async function handleValidSubmit(values: OrganizationFormValues) {
    const accessToken = window.localStorage.getItem("access_token")
    const storedUser = parseStoredAuthUser(window.localStorage.getItem("auth_user"))
    const userId = storedUser?.id

    if (!accessToken) {
      toast.error(
        isEditMode
          ? "Please sign in again to edit an organization."
          : "Please sign in again to create an organization.",
      )
      return
    }

    if (isEditMode && !organization?.id) {
      toast.error("No organization is selected for editing.")
      return
    }

    if (isEditMode && !userId) {
      toast.error("Please sign in again to update the default organization.")
      return
    }

    const authenticatedAccessToken = accessToken

    try {
      let savedOrganization = isEditMode
        ? await updateOrganization({
            apiUrl,
            accessToken: authenticatedAccessToken,
            id: organization!.id,
            payload: values,
          })
        : await createOrganization({
            apiUrl,
            accessToken: authenticatedAccessToken,
            payload: values,
        })

      if (isEditMode && organization!.isDefault !== values.isDefault) {
        if (!userId) {
          toast.error("Please sign in again to update the default organization.")
          return
        }

        const authenticatedUserId = userId

        await updateOrganizationDefault({
          apiUrl,
          accessToken: authenticatedAccessToken,
          userId: authenticatedUserId,
          organizationId: organization!.id,
          isDefault: values.isDefault,
        })
        savedOrganization = {
          ...savedOrganization,
          isDefault: values.isDefault,
        }
      }

      toast.success(
        isEditMode ? "Organization updated successfully." : "Organization created successfully.",
      )
      onSaved?.(savedOrganization)
      onOpenChange(false)
      reset(DEFAULT_VALUES)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Unable to update the organization right now."
            : "Unable to create the organization right now."
      toast.error(message)
    }
  }

  function handleLogout() {
    clearStoredAuthSession()
    document.cookie = clearAuthSessionCookie()
    document.cookie = clearAuthUserLabelCookie()
    document.cookie = clearAuthUserAvatarCookie()
    router.replace("/sign-in")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <form
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          noValidate
          onSubmit={handleSubmit(handleValidSubmit)}
        >
          <div className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit organization" : "Create organization"}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update the selected organization using the same fields exposed by the organization API."
                  : showLogoutAction
                    ? "No organizations are mapped to this account yet. Create one to continue or log out."
                    : "Add a new organization using the same fields exposed by the organization API."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <label htmlFor="organization-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Organization name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="organization-name"
                  placeholder="Input organization name"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name", {
                    required: "Organization name is required.",
                    setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                  })}
                />
                <FieldErrorMessage message={errors.name?.message} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="organization-address" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Address
                </label>
                <Textarea
                  id="organization-address"
                  placeholder="Input organization address"
                  className="min-h-24"
                  {...register("address", {
                    setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                  })}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="organization-contact" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Contact
                </label>
                <Input
                  id="organization-contact"
                  placeholder="Input contact number or email"
                  {...register("contact", {
                    setValueAs: (value) => (typeof value === "string" ? value.trim() : value),
                  })}
                />
              </div>

              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                    <Checkbox
                      id="organization-default"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor="organization-default"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Make this the default organization
                      </label>
                      <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        The default organization is selected automatically when this user logs in.
                      </p>
                    </div>
                  </div>
                )}
              />
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              {showLogoutAction ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                >
                  <LogOut className="size-3.5" />
                  Logout
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {isEditMode ? "Save changes" : "Save organization"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
