export const SELECTED_ORGANIZATION_ID_STORAGE_KEY = "selected_organization_id"
export const SELECTED_ORGANIZATION_CHANGED_EVENT = "organization-selection-change"

export function readSelectedOrganizationId() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(SELECTED_ORGANIZATION_ID_STORAGE_KEY) || ""
}

export function writeSelectedOrganizationId(organizationId: string) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SELECTED_ORGANIZATION_ID_STORAGE_KEY, organizationId)
  const dispatchOrganizationChange = () => {
    window.dispatchEvent(
      new CustomEvent(SELECTED_ORGANIZATION_CHANGED_EVENT, {
        detail: {
          organizationId,
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
