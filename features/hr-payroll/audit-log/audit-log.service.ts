import { hrRequest, type HrRequestContext } from "../shared/hr-api"
import type { HrAuditFeed, HrAuditFilters } from "./audit-log.types"

export function getHrAuditLog(
  context: HrRequestContext,
  filters: HrAuditFilters
) {
  return hrRequest<HrAuditFeed>(context, "/api/v1/hr/audit-log", {
    query: filters,
  })
}
