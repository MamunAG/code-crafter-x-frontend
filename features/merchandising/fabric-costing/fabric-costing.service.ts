import type {
  ApiResponse,
  FabricCostingFilterValues,
  FabricCostingFormValues,
  FabricCostingRecord,
  PaginatedResponse,
} from "./fabric-costing.types"
import { calculateFabricCost, type FabricCostingInput } from "./fabric-costing-calculation"

function buildApiUrl(apiUrl: string, path: string) {
  return new URL(path, apiUrl)
}

function buildRequestHeaders({
  accessToken,
  organizationId,
  contentType,
}: {
  accessToken: string
  organizationId?: string
  contentType?: string
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  }

  if (contentType) headers["Content-Type"] = contentType
  if (organizationId) headers["x-organization-id"] = organizationId

  return headers
}

async function readJsonResponse<T>(response: Response) {
  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.")
  }

  if (response.status === 403) {
    throw new Error(payload?.message || "You do not have permission to complete this fabric costing action.")
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Unable to complete the fabric costing request right now.")
  }

  return payload
}

function appendFilterParams(url: URL, filters: Partial<FabricCostingFilterValues>) {
  const costName = filters.costName?.trim() ?? ""
  const fabricId = filters.fabricId?.trim() ?? ""
  const currencyId = filters.currencyId?.trim() ?? ""
  const unitId = filters.unitId?.trim() ?? ""

  if (costName) url.searchParams.set("costName", costName)
  if (fabricId) url.searchParams.set("fabricId", fabricId)
  if (currencyId) url.searchParams.set("currencyId", currencyId)
  if (unitId) url.searchParams.set("unitId", unitId)
}

function optionalString(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function optionalNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number(trimmedValue) : undefined
}

function normalizeNumber(value: string, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function buildCalculationInput(values: FabricCostingFormValues): FabricCostingInput {
  return {
    targetQty: normalizeNumber(values.qty, 1),
    currencySymbol: "$",
    commonWastages: values.commonProcesses.map((process) => ({
      id: process.id,
      name: process.processLabel || "Unnamed process",
      wastagePercent: normalizeNumber(process.wastagePercentage),
    })),
    materials: values.yarns.map((yarn) => ({
      id: yarn.id,
      name: yarn.yarnLabel || "Unnamed material",
      ratioPercent: normalizeNumber(yarn.percentagePerUnitFabric),
      pricePerKg: normalizeNumber(yarn.yarnPricePerUnit),
      extraProcesses: yarn.yarnWiseProcesses.map((process) => ({
        id: process.id,
        name: process.processLabel || "Unnamed extra process",
        wastagePercent: normalizeNumber(process.wastagePercentage),
        costPerKg: normalizeNumber(process.rateUnitFabric),
      })),
    })),
    processes: values.commonProcesses.map((process) => ({
      id: process.id,
      name: process.processLabel || "Unnamed process",
      costPerKg: normalizeNumber(process.ratePerUnitFabric),
    })),
  }
}

function buildPayload(values: FabricCostingFormValues) {
  const qty = normalizeNumber(values.qty, 1)
  const calculation = calculateFabricCost(buildCalculationInput(values))
  const materialTotalsById = new Map(
    calculation.materialResults.map((material) => [material.id, material.totalCost]),
  )

  return {
    costName: optionalString(values.costName),
    fabricId: optionalString(values.fabricId),
    qty,
    unitId: optionalNumber(values.unitId),
    currencyId: Number(values.currencyId),
    yarns: values.yarns.map((yarn) => ({
      yarnId: optionalString(yarn.yarnId),
      percentagePerUnitFabric: normalizeNumber(yarn.percentagePerUnitFabric),
      yarnPricePerUnit: normalizeNumber(yarn.yarnPricePerUnit),
      totalYarnPrice: materialTotalsById.get(yarn.id) ?? 0,
      yarnWiseProcesses: yarn.yarnWiseProcesses.map((process) => ({
        processId: optionalNumber(process.processId),
        rateUnitFabric: normalizeNumber(process.rateUnitFabric),
        wastagePercentage: normalizeNumber(process.wastagePercentage),
      })),
    })),
    commonProcesses: values.commonProcesses.map((process) => ({
      processId: optionalNumber(process.processId),
      ratePerUnitFabric: normalizeNumber(process.ratePerUnitFabric),
      wastagePercentage: normalizeNumber(process.wastagePercentage),
    })),
  }
}

export async function fetchFabricCostings({
  apiUrl,
  accessToken,
  organizationId,
  page,
  limit,
  filters,
  deletedOnly = false,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  page: number
  limit: number
  filters: Partial<FabricCostingFilterValues>
  deletedOnly?: boolean
}): Promise<PaginatedResponse<FabricCostingRecord>> {
  const url = buildApiUrl(apiUrl, "/api/v1/fabric-costing")
  url.searchParams.set("page", String(page))
  url.searchParams.set("limit", String(limit))
  if (deletedOnly) url.searchParams.set("deletedOnly", "true")
  appendFilterParams(url, filters)

  const response = await fetch(url, {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<PaginatedResponse<FabricCostingRecord>>(response)

  if (!payload.data?.items || !payload.data?.meta) {
    throw new Error("The fabric costing list was returned without pagination data.")
  }

  return payload.data
}

export async function fetchFabricCosting({
  apiUrl,
  accessToken,
  organizationId,
  id,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: string
}): Promise<FabricCostingRecord> {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-costing/${id}`), {
    method: "GET",
    headers: buildRequestHeaders({ accessToken, organizationId }),
    cache: "no-store",
  })

  const payload = await readJsonResponse<FabricCostingRecord>(response)

  if (!payload.data) {
    throw new Error("The fabric costing record was returned without data.")
  }

  return payload.data
}

export async function createFabricCosting({
  apiUrl,
  accessToken,
  organizationId,
  payload,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  payload: FabricCostingFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, "/api/v1/fabric-costing"), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildPayload(payload)),
  })

  const payloadData = await readJsonResponse<FabricCostingRecord>(response)

  if (!payloadData.data) {
    throw new Error("The fabric costing was saved, but the created record was not returned.")
  }

  return payloadData.data
}

export async function updateFabricCosting({
  apiUrl,
  accessToken,
  organizationId,
  id,
  payload,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: string
  payload: FabricCostingFormValues
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-costing/${id}`), {
    method: "PATCH",
    headers: buildRequestHeaders({ accessToken, organizationId, contentType: "application/json" }),
    body: JSON.stringify(buildPayload(payload)),
  })

  const payloadData = await readJsonResponse<FabricCostingRecord>(response)

  if (!payloadData.data) {
    throw new Error("The fabric costing was updated, but the updated record was not returned.")
  }

  return payloadData.data
}

export async function softDeleteFabricCosting({
  apiUrl,
  accessToken,
  organizationId,
  id,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-costing/${id}`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function restoreFabricCosting({
  apiUrl,
  accessToken,
  organizationId,
  id,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-costing/${id}/restore`), {
    method: "POST",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}

export async function permanentlyDeleteFabricCosting({
  apiUrl,
  accessToken,
  organizationId,
  id,
}: {
  apiUrl: string
  accessToken: string
  organizationId?: string
  id: string
}) {
  const response = await fetch(buildApiUrl(apiUrl, `/api/v1/fabric-costing/${id}/permanent`), {
    method: "DELETE",
    headers: buildRequestHeaders({ accessToken, organizationId }),
  })

  await readJsonResponse(response)
}
