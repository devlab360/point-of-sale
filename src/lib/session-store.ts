/**
 * Secure Session Storage Utility
 *
 * Security model:
 * - Auth tokens (user ID, session ID) → sessionStorage (auto-cleared on tab close)
 * - Sync identifiers (org ID, timestamps) → localStorage (needed for offline sync engine)
 * - All values obfuscated with btoa/atob to prevent plain-text exposure in browser devtools
 *
 * Note: btoa is NOT encryption — it prevents casual inspection.
 * For a POS app on a controlled device, this is an acceptable security posture.
 */

const PREFIX = "pos_";

function encode(value: string): string {
  try {
    return btoa(`${PREFIX}${value}`);
  } catch {
    return value;
  }
}

function decode(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const decoded = atob(raw);
    if (decoded.startsWith(PREFIX)) {
      return decoded.slice(PREFIX.length);
    }
    // Fallback: value might be stored in old plain-text format
    return raw;
  } catch {
    // Old plain-text value — return as-is for backward compatibility
    return raw;
  }
}

// ─── Session Storage (cleared when browser tab closes) ────────────────────────
// Used for: auth user ID, session ID — sensitive, should not persist

export const SessionStore = {
  setAuthUser: (userId: string) =>
    sessionStorage.setItem("pos_auth_user", encode(userId)),

  getAuthUser: (): string | null =>
    decode(sessionStorage.getItem("pos_auth_user")),

  removeAuthUser: () =>
    sessionStorage.removeItem("pos_auth_user"),

  setSession: (sessionId: string) =>
    sessionStorage.setItem("pos_saas_session", encode(sessionId)),

  getSession: (): string | null =>
    decode(sessionStorage.getItem("pos_saas_session")),

  removeSession: () =>
    sessionStorage.removeItem("pos_saas_session"),

  clearAll: () => {
    sessionStorage.removeItem("pos_auth_user");
    sessionStorage.removeItem("pos_saas_session");
  },
};

// ─── Local Storage (persists across browser sessions) ─────────────────────────
// Used for: org ID (needed for sync engine), timestamps, flags
// These are non-sensitive identifiers — org UUID alone cannot authenticate

export const PersistStore = {
  setOrgId: (orgId: string) =>
    localStorage.setItem("pos_org_id", encode(orgId)),

  getOrgId: (): string | null =>
    decode(localStorage.getItem("pos_org_id")),

  removeOrgId: () =>
    localStorage.removeItem("pos_org_id"),

  setLastSyncedAt: (ts: string) =>
    localStorage.setItem("pos_last_synced_at", ts), // timestamp, not sensitive

  getLastSyncedAt: (): string | null =>
    localStorage.getItem("pos_last_synced_at"),

  setFlag: (key: string) =>
    localStorage.setItem(key, "true"),

  getFlag: (key: string): boolean =>
    localStorage.getItem(key) === "true",

  removeFlag: (key: string) =>
    localStorage.removeItem(key),
};
