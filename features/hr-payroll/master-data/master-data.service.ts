import { requireSelectedOrganizationId } from "@/lib/organization-selection"

import type { MasterDataConfig, MasterDataFormValues, MasterDataRecord, PaginatedMasterData } from "./master-data.types"

type ApiResponse<T> = { success: boolean; message: string; data?: T }

function headers(token: string, organizationId: string, json = false) {
  const selectedOrganizationId = requireSelectedOrganizationId(organizationId)
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "x-organization-id": selectedOrganizationId, ...(json ? { "Content-Type": "application/json" } : {}) }
}

async function read<T>(response: Response, config: MasterDataConfig) {
  let payload: ApiResponse<T> | null = null
  try { payload = (await response.json()) as ApiResponse<T> } catch { payload = null }
  if (response.status === 401) throw new Error("Your session expired. Please sign in again.")
  if (response.status === 403) throw new Error(payload?.message || `You do not have permission to manage ${config.singular} records.`)
  if (!response.ok || !payload?.success) throw new Error(payload?.message || `Unable to complete the ${config.singular} request.`)
  return payload.data as T
}

function url(apiUrl: string, config: MasterDataConfig, suffix = "") {
  return new URL(`/api/v1/hr/master-data/${config.apiPath}${suffix}`, apiUrl)
}

export async function listMasterData(args: { apiUrl: string; token: string; organizationId: string; config: MasterDataConfig; page: number; limit: number; search: string; isActive: string; deletedOnly?: boolean }) {
  const endpoint = url(args.apiUrl, args.config)
  endpoint.searchParams.set("page", String(args.page)); endpoint.searchParams.set("limit", String(args.limit))
  if (args.search.trim()) endpoint.searchParams.set("search", args.search.trim())
  if (args.isActive) endpoint.searchParams.set("isActive", args.isActive)
  if (args.deletedOnly) endpoint.searchParams.set("deletedOnly", "true")
  return read<PaginatedMasterData>(await fetch(endpoint, { headers: headers(args.token, args.organizationId), cache: "no-store" }), args.config)
}

export async function getMasterData(apiUrl: string, token: string, organizationId: string, config: MasterDataConfig, id: string) {
  return read<MasterDataRecord>(await fetch(url(apiUrl, config, `/${id}`), { headers: headers(token, organizationId), cache: "no-store" }), config)
}

export async function saveMasterData(apiUrl: string, token: string, organizationId: string, config: MasterDataConfig, values: MasterDataFormValues, id?: string) {
  const common = { name: values.name.trim(), nameBn: values.nameBn.trim() || undefined, settings: values.settings, isActive: values.isActive }
  const payload = id ? { ...common, rowVersion: values.rowVersion } : { code: values.code.trim(), ...common }
  return read<MasterDataRecord>(await fetch(url(apiUrl, config, id ? `/${id}` : ""), { method: id ? "PATCH" : "POST", headers: headers(token, organizationId, true), body: JSON.stringify(payload) }), config)
}

export async function deleteMasterData(apiUrl: string, token: string, organizationId: string, config: MasterDataConfig, id: string, permanent = false) {
  return read(await fetch(url(apiUrl, config, `/${id}${permanent ? "/permanent" : ""}`), { method: "DELETE", headers: headers(token, organizationId) }), config)
}

export async function restoreMasterData(apiUrl: string, token: string, organizationId: string, config: MasterDataConfig, id: string) {
  return read<MasterDataRecord>(await fetch(url(apiUrl, config, `/${id}/restore`), { method: "POST", headers: headers(token, organizationId) }), config)
}

export async function downloadTemplate(apiUrl: string, token: string, organizationId: string, config: MasterDataConfig) {
  const response = await fetch(url(apiUrl, config, "/template/upload"), { headers: headers(token, organizationId) })
  if (!response.ok) throw new Error(`Unable to download the ${config.singular} template.`)
  return response.blob()
}

export async function uploadTemplate(apiUrl: string, token: string, organizationId: string, config: MasterDataConfig, file: File) {
  const form = new FormData(); form.append("file", file)
  return read<{ inserted: number; skipped: number; errors: Array<{ row: number; message: string }> }>(await fetch(url(apiUrl, config, "/upload"), { method: "POST", headers: headers(token, organizationId), body: form }), config)
}
