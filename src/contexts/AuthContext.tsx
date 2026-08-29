import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  initiateGoogleOAuth,
  initiateFacebookOAuth,
  GOOGLE_CLIENT_ID,
  FACEBOOK_APP_ID,
} from "@/lib/auth-social";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { SessionStore, PersistStore } from "@/lib/session-store";
import {
  loginFn,
  getOrgDataFn,
  verifyUserEmailFn,
  getCurrentUserFn,
  loginWithOtpFn,
  loginWithGoogleFn,
  loginWithFirebasePhoneFn,
  logoutFn,
} from "@/api/auth";
import { getEffectiveMenusFn } from "@/api/subscriptions";
import { useQuery, useMutation } from "@tanstack/react-query";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  saasOrg: any;
  saasPlan: any;
  settings: any;
  effectiveMenus: string[];
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  loginWithOtp: (email: string, otp: string) => Promise<boolean>;
  loginWithSocial: (provider: "google") => Promise<boolean>;
  loginWithGoogleToken: (token: string) => Promise<boolean>;
  loginWithFirebasePhone: (idToken: string) => Promise<boolean>;
  logout: () => void;
  isEmailVerified: boolean;
  isTrialExpired: boolean;
  subscriptionStatus: string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const orgId = PersistStore.getOrgId();

  const { data: orgData, refetch: refetchOrgData } = useQuery({
    queryKey: ["orgData", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const res = await getOrgDataFn({ data: { orgId } });
      if (res.success) return res;
      return null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const saasOrg = orgData?.org;
  const saasPlan = orgData?.plan;
  const settings = orgData?.settings;

  const { data: menusData, refetch: refetchMenus } = useQuery({
    queryKey: ["effectiveMenus", orgId, user?.id],
    queryFn: async () => {
      const res = await getEffectiveMenusFn({ data: {} });
      if (res.success) return res.menus || [];
      return [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const effectiveMenus = menusData || [];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await getCurrentUserFn();
        if (res && res.success && res.user) {
          setUser(res.user);
          SessionStore.setAuthUser(res.user.id);
          if (res.user.organizationId) {
            PersistStore.setOrgId(res.user.organizationId);
          }
        } else {
          SessionStore.clearAll();
          PersistStore.clearAll();
          setUser(null);
        }
      } catch (error) {
        SessionStore.clearAll();
        PersistStore.clearAll();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginWithOtp = useCallback(
    async (email: string, otp: string) => {
      try {
        const res = await loginWithOtpFn({ data: { email, otp } });

        if (res.success && res.user) {
          setUser(res.user);
          SessionStore.setAuthUser(res.user.id);
          if (res.user.organizationId) {
            PersistStore.setOrgId(res.user.organizationId);
            refetchOrgData();
          }

          // Log SaaS Session
          const sessionId = crypto.randomUUID();
          SessionStore.setSession(sessionId);

          router.navigate({ to: "/" });

          toast.success(res.message || "Login successful");
          return true;
        }
        toast.error(res.error || "Invalid OTP code");
        return false;
      } catch (e) {
        toast.error("Login failed");
        return false;
      }
    },
    [refetchOrgData, router],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await loginFn({ data: { email, password } });
        if (!res.success) {
          toast.error(res.error || "Incorrect email or password");
          return false;
        }
        if (!res.user) {
          toast.error("Incorrect email or password");
          return false;
        }

        setUser(res.user);
        SessionStore.setAuthUser(res.user.id);
        if (res.user.organizationId) {
          PersistStore.setOrgId(res.user.organizationId);
          refetchOrgData();
        }

        // Log SaaS Session
        const sessionId = crypto.randomUUID();
        SessionStore.setSession(sessionId);

        toast.success(res.message || `Welcome back, ${res.user.name}`);

        if (res.user.role === "super_admin") {
          router.navigate({ to: "/admin" });
        } else {
          router.navigate({ to: "/" });
        }

        return true;
      } catch (error) {
        toast.error("Login failed");
        return false;
      }
    },
    [refetchOrgData, router],
  );

  const loginWithGoogleToken = useCallback(
    async (accessToken: string) => {
      try {
        const res = await loginWithGoogleFn({ data: { accessToken } });

        if (res.success && res.user) {
          setUser(res.user);
          SessionStore.setAuthUser(res.user.id);
          if (res.user.organizationId) {
            PersistStore.setOrgId(res.user.organizationId);
            refetchOrgData();
          }

          const sessionId = crypto.randomUUID();
          SessionStore.setSession(sessionId);

          if (
            res.user.role === "admin" ||
            res.user.role === "manager" ||
            res.user.role === "store_admin"
          ) {
            router.navigate({ to: "/" });
          } else if (res.user.role === "cashier") {
            router.navigate({ to: "/pos" });
          } else if (res.user.role === "inventory_manager") {
            router.navigate({ to: "/inventory" });
          } else {
            router.navigate({ to: "/" });
          }

          toast.success(res.message || "Login successful");
          return true;
        }
        toast.error(res.error || "Failed to login with Google");
        return false;
      } catch (e) {
        toast.error("Google Login failed");
        return false;
      }
    },
    [refetchOrgData, router],
  );

  const loginWithFirebasePhone = useCallback(
    async (idToken: string) => {
      try {
        const res = await loginWithFirebasePhoneFn({ data: { idToken } });

        if (res.success && res.user) {
          setUser(res.user);
          SessionStore.setAuthUser(res.user.id);
          if (res.user.organizationId) {
            PersistStore.setOrgId(res.user.organizationId);
            refetchOrgData();
          }

          const sessionId = crypto.randomUUID();
          SessionStore.setSession(sessionId);

          if (
            res.user.role === "admin" ||
            res.user.role === "manager" ||
            res.user.role === "store_admin"
          ) {
            router.navigate({ to: "/" });
          } else if (res.user.role === "cashier") {
            router.navigate({ to: "/pos" });
          } else if (res.user.role === "inventory_manager") {
            router.navigate({ to: "/inventory" });
          } else {
            router.navigate({ to: "/" });
          }

          toast.success(res.message || "Login successful");
          return true;
        }
        toast.error(res.error || "Failed to login with phone number");
        return false;
      } catch (e) {
        toast.error("Phone Login failed");
        return false;
      }
    },
    [refetchOrgData, router],
  );

  const loginWithSocial = useCallback(
    async (provider: "google") => {
      try {
        if (provider === "google" && GOOGLE_CLIENT_ID) {
          initiateGoogleOAuth();
          return true;
        }

        const mockEmail = "google.user@store.com";
        const mockName = "Google User";

        // Mock social user for demo without DB save
        const foundUser = {
          id: `social-${Date.now()}`,
          name: mockName,
          email: mockEmail,
          role: "admin",
          status: "active",
          lastActive: new Date().toISOString(),
          pin: "1234",
          organizationId: null,
        } as any;

        setUser(foundUser);
        SessionStore.setAuthUser(foundUser.id);
        if (foundUser.organizationId) {
          PersistStore.setOrgId(foundUser.organizationId);
        }
        toast.success("Logged in with Google successfully!");
        router.navigate({ to: "/" });
        return true;
      } catch (err) {
        toast.error(`Failed to login with ${provider}`);
        return false;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await logoutFn({ data: {} });
    } catch {}
    SessionStore.clearAll();
    PersistStore.clearAll();
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    router.navigate({ to: "/login" });
  }, [router]);

  const isTrialExpired = useMemo(() => {
    const subStatus = saasOrg?.status || settings?.subscriptionStatus || "trial";
    if (subStatus === "active") return false;
    const expiryDateStr = saasOrg?.planExpiryDate || settings?.trialEndsAt;
    if (!expiryDateStr) return false;
    return new Date() > new Date(expiryDateStr);
  }, [saasOrg, settings]);

  const isEmailVerified = useMemo(() => {
    return user ? user.emailVerified !== false : true;
  }, [user]);

  const subscriptionStatus = useMemo(() => {
    return saasOrg?.status || settings?.subscriptionStatus || "trial";
  }, [saasOrg?.status, settings?.subscriptionStatus]);

  const refreshUser = useCallback(async () => {
    try {
      const storedUserId = SessionStore.getAuthUser();
      if (storedUserId) {
        const res = await getCurrentUserFn();
        if (res.success && res.user) {
          setUser(res.user);
        }
      }
    } catch (error) {
      console.error("User refresh failed:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loginWithOtp,
      loginWithEmail,
      loginWithSocial,
      loginWithGoogleToken,
      loginWithFirebasePhone,
      logout,
      isLoading,
      isEmailVerified,
      isTrialExpired,
      subscriptionStatus,
      saasOrg,
      saasPlan,
      settings,
      effectiveMenus,
      refreshUser,
    }),
    [
      user,
      loginWithOtp,
      loginWithEmail,
      loginWithSocial,
      loginWithGoogleToken,
      loginWithFirebasePhone,
      logout,
      isLoading,
      isEmailVerified,
      isTrialExpired,
      subscriptionStatus,
      saasOrg,
      saasPlan,
      settings,
      effectiveMenus,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
