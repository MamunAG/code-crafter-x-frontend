export const SELECTED_ORGANIZATION_ID_STORAGE_KEY = "selected_organization_id"
export const SELECTED_ORGANIZATION_CHANGED_EVENT = "organization-selection-change"

export function readSelectedOrganizationId() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(SELECTED_ORGANIZATION_ID_STORAGE_KEY)?.trim() || ""
}

export function requireSelectedOrganizationId(requestedOrganizationId?: string) {
  const selectedOrganizationId = readSelectedOrganizationId()
  if (!selectedOrganizationId) {
    throw new Error("Select an organization before continuing.")
  }

  const requested = requestedOrganizationId?.trim()
  if (requested && requested !== selectedOrganizationId) {
    throw new Error(
      "The selected organization changed. Close this form and try again.",
    )
  }

  return selectedOrganizationId
}

export function writeSelectedOrganizationId(organizationId: string) {
  if (typeof window === "undefined") {
    return
  }

  const selectedOrganizationId = organizationId.trim()
  if (selectedOrganizationId) {
    window.localStorage.setItem(
      SELECTED_ORGANIZATION_ID_STORAGE_KEY,
      selectedOrganizationId,
    )
  } else {
    window.localStorage.removeItem(SELECTED_ORGANIZATION_ID_STORAGE_KEY)
  }

  const dispatchOrganizationChange = () => {
    window.dispatchEvent(
      new CustomEvent(SELECTED_ORGANIZATION_CHANGED_EVENT, {
        detail: {
          organizationId: selectedOrganizationId,
        },
      }),
    )
  }

  if (typeof queueMicrotask === "function") {
    queueMicrotask(dispatchOrganizationChange)
    return
  }

  window.setTimeout(dispatchOrganizationChange, 0)
}
