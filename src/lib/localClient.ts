/**
 * Legacy shim — all callers have been migrated to @/lib/api
 * Kept to prevent import errors during transition.
 */
export { dbSelect, dbInsert, dbUpdate, dbDelete, auth, storage } from "@/lib/api";
