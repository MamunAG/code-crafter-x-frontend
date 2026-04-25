"use client"

import { useEffect } from "react"

import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

import { createOrganization } from "./organization.service"
import type { OrganizationFormValues, OrganizationRecord } from "./organization.types"

type OrganizationEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (organization: OrganizationRecord) => void
}

const DEFAULT_VALUES: OrganizationFormValues = {
  name: "",
  address: "",
  contact: "",
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
  onCreated,
}: OrganizationEntryDialogProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    reset,
  } = useForm<OrganizationFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: "onSubmit",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES)
      clearErrors()
      return
    }

    if (!open) {
      reset(DEFAULT_VALUES)
      clearErrors()
      return
    }
  }, [clearErrors, open, reset])

  async function handleValidSubmit(values: OrganizationFormValues) {
    const accessToken = window.localStorage.getItem("access_token")

    if (!accessToken) {
      toast.error("Please sign in again to create an organization.")
      return
    }

    try {
      const organization = await createOrganization({
        apiUrl,
        accessToken,
        payload: values,
      })

      toast.success("Organization created successfully.")
      onCreated?.(organization)
      onOpenChange(false)
      reset(DEFAULT_VALUES)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the organization right now."
      toast.error(message)
    }
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
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                Add a new organization using the same fields exposed by the organization API.
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
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save organization
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
