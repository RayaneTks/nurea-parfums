/**
 * Back-office : tables Prisma AdminUser, AuditLog, ExternalImportSuggestion.
 * UI : /admin — API : /api/admin/* (session JWT cookie, hors login).
 */

export { ADMIN_COOKIE, signAdminToken, verifyAdminToken } from "./session";
export { requireAdmin, canEdit, requireEditor } from "./requireAdmin";
