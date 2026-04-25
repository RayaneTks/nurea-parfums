/**
 * Back-office : tables Prisma AdminUser, AuditLog, ExternalImportSuggestion.
 * UI : /admin — API : /api/admin/* (session JWT cookie, hors login).
 */

export { ADMIN_COOKIE, signAdminToken, verifyAdminToken } from "./session";
export { requireAdmin, canEdit, requireEditor } from "./requireAdmin";
export type {
  AdminBrandRow,
  AdminCatalogueCache,
  AdminCataloguePayload,
  AdminPerfumeRow,
  AdminSessionUser,
} from "./catalogue-types";
export { adminFetchJson, readJsonSafe } from "./http";
export { getAdminCatalogueSnapshot, ADMIN_CATALOGUE_CACHE_TAG } from "./getCatalogueSnapshot";
export { revalidateAdminCatalogue } from "./revalidateAdminCatalogue";
