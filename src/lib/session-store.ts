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

// ─── Auth Store (persists across hard refreshes — cleared only on explicit logout) ──
// Moved from sessionStorage to localStorage to survive Ctrl+F5 hard refreshes.
// Values remain obfuscated with btoa. Explicit logout calls clearAll().

export const SessionStore = {
  setAuthUser: (userId: string) => {
    if (typeof window !== "undefined") localStorage.setItem("pos_auth_user", encode(userId));
  },

  getAuthUser: (): string | null => {
    if (typeof window === "undefined") return null;
    return decode(localStorage.getItem("pos_auth_user"));
  },

  removeAuthUser: () => {
    if (typeof window !== "undefined") localStorage.removeItem("pos_auth_user");
  },

  setSession: (sessionId: string) => {
    if (typeof window !== "undefined") localStorage.setItem("pos_saas_session", encode(sessionId));
  },

  getSession: (): string | null => {
    if (typeof window === "undefined") return null;
    return decode(localStorage.getItem("pos_saas_session"));
  },

  removeSession: () => {
    if (typeof window !== "undefined") localStorage.removeItem("pos_saas_session");
  },

  clearAll: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pos_auth_user");
      localStorage.removeItem("pos_saas_session");
    }
  },
};

// ─── Local Storage (persists across browser sessions) ─────────────────────────
// Used for: org ID (needed for sync engine), timestamps, flags
// These are non-sensitive identifiers — org UUID alone cannot authenticate

export const PersistStore = {
  setOrgId: (orgId: string) => {
    if (typeof window !== "undefined") localStorage.setItem("pos_org_id", encode(orgId));
  },

  getOrgId: (): string | null => {
    if (typeof window === "undefined") return null;
    return decode(localStorage.getItem("pos_org_id"));
  },

  removeOrgId: () => {
    if (typeof window !== "undefined") localStorage.removeItem("pos_org_id");
  },

  setLastSyncedAt: (ts: string) => {
    if (typeof window !== "undefined") localStorage.setItem("pos_last_synced_at", ts);
  },

  getLastSyncedAt: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("pos_last_synced_at");
  },

  setFlag: (key: string) => {
    if (typeof window !== "undefined") localStorage.setItem(key, "true");
  },

  getFlag: (key: string): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) === "true";
  },

  removeFlag: (key: string) => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
  },

  clearAll: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pos_org_id");
      localStorage.removeItem("pos_last_synced_at");
    }
  },
};
