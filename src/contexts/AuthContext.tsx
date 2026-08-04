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
import { loginFn, getOrgDataFn, verifyUserEmailFn, getCurrentUserFn } from "@/api/auth";
import { useQuery, useMutation } from "@tanstack/react-query";

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  loginWithSocial: (provider: "google" | "facebook") => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isEmailVerified: boolean;
  isTrialExpired: boolean;
  subscriptionStatus: string;
  saasOrg: any;
  saasPlan: any;
  settings?: any;
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
  });

  const saasOrg = orgData?.org;
  const saasPlan = orgData?.plan;
  const settings = orgData?.settings;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = SessionStore.getAuthUser();
        if (storedUserId) {
          const res = await getCurrentUserFn();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            SessionStore.removeAuthUser();
          }
        } else {
          SessionStore.removeAuthUser();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (pin: string) => {
      try {
        // Pass orgId from PersistStore so backend can scope PIN lookup to the correct org (C-2 security fix)
        const currentOrgId = PersistStore.getOrgId();
        const res = await loginFn({ data: { pin, orgId: currentOrgId } });

        if (res.success && res.user) {
          setUser(res.user);
          SessionStore.setAuthUser(res.user.id);
          if (res.user.organizationId) {
            const oId = res.user.organizationId;
            PersistStore.setOrgId(oId);
            await refetchOrgData();
          }

          // Log SaaS Session (skip DB add for now until session API is built)
          const sessionId = crypto.randomUUID();
          SessionStore.setSession(sessionId);

          // Redirect based on role
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
        toast.error(res.error || "Invalid PIN");
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
        if (!res.success || !res.user) {
          toast.error(res.error || "Incorrect email or password");
          return false;
        }

        setUser(res.user);
        SessionStore.setAuthUser(res.user.id);
        if (res.user.organizationId) {
          PersistStore.setOrgId(res.user.organizationId);
          await refetchOrgData();
        }

        // Log SaaS Session
        const sessionId = crypto.randomUUID();
        SessionStore.setSession(sessionId);

        toast.success(res.message || `Welcome back, ${res.user.name}`);

        // Redirect based on role
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

        return true;
      } catch (error) {
        toast.error("Login failed");
        return false;
      }
    },
    [refetchOrgData, router],
  );

  const loginWithSocial = useCallback(
    async (provider: "google" | "facebook") => {
      try {
        if (provider === "google" && GOOGLE_CLIENT_ID) {
          initiateGoogleOAuth();
          return true;
        }
        if (provider === "facebook" && FACEBOOK_APP_ID) {
          initiateFacebookOAuth();
          return true;
        }

        const mockEmail =
          provider === "google" ? "google.user@store.com" : "facebook.user@store.com";
        const mockName = provider === "google" ? "Google User" : "Facebook User";

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
        toast.success(
          `Logged in with ${provider === "google" ? "Google" : "Facebook"} successfully!`,
        );
        router.navigate({ to: "/" });
        return true;
      } catch (err) {
        toast.error(`Failed to login with ${provider} `);
        return false;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    SessionStore.clearAll();
    setUser(null);
    router.navigate({ to: "/login" });
  }, [router]);

  const isTrialExpired = useMemo(() => {
    if (user?.email?.toLowerCase().includes("superadmin")) return false;
    const subStatus = saasOrg?.status || settings?.subscriptionStatus || "trial";
    if (subStatus === "active") return false;
    const expiryDateStr = saasOrg?.planExpiryDate || settings?.trialEndsAt;
    if (!expiryDateStr) return false;
    return new Date() > new Date(expiryDateStr);
  }, [saasOrg, settings, user]);

  const isEmailVerified = useMemo(() => {
    return user
      ? user.emailVerified !== false || user.email?.toLowerCase().includes("superadmin")
      : true;
  }, [user]);

  const subscriptionStatus = useMemo(() => {
    return saasOrg?.status || settings?.subscriptionStatus || "trial";
  }, [saasOrg?.status, settings?.subscriptionStatus]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      loginWithEmail,
      loginWithSocial,
      logout,
      isLoading,
      isEmailVerified,
      isTrialExpired,
      subscriptionStatus,
      saasOrg,
      saasPlan,
      settings,
    }),
    [
      user,
      login,
      loginWithEmail,
      loginWithSocial,
      logout,
      isLoading,
      isEmailVerified,
      isTrialExpired,
      subscriptionStatus,
      saasOrg,
      saasPlan,
      settings,
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
