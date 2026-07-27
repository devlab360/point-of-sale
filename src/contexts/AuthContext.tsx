import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LocalUser } from "@/lib/db";
import { initiateGoogleOAuth, initiateFacebookOAuth, GOOGLE_CLIENT_ID, FACEBOOK_APP_ID } from "@/lib/auth-social";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { getSuperAdminDataFn, pullEverythingFn, verifyUserEmailFn } from "@/sync-api";

interface AuthContextType {
  user: LocalUser | null;
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
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [saasOrgState, setSaasOrgState] = useState<any>(null);
  const [saasPlanState, setSaasPlanState] = useState<any>(null);
  const router = useRouter();

  const liveSaasOrg = useLiveQuery(
    () => (user?.orgId ? localDb.saasOrganizations.get(user.orgId) : undefined),
    [user?.orgId]
  );
  const saasOrg = liveSaasOrg || saasOrgState;

  const liveSaasPlan = useLiveQuery(
    () => {
      const planId = saasOrg?.currentPlanId;
      if (!planId) return undefined;
      return localDb.saasPlans.get(planId);
    },
    [saasOrg?.currentPlanId]
  );
  const saasPlan = liveSaasPlan || saasPlanState;

  useEffect(() => {
    if (user?.orgId && !user.email?.toLowerCase().includes("superadmin")) {
      const syncCloudPlans = async () => {
        try {
          const org = await localDb.saasOrganizations.get(user.orgId!);
          const syncKey = org?.syncKey || "default-sync-key";
          const pullResult = await pullEverythingFn({ data: { orgId: user.orgId!, syncKey } });
          if (pullResult.success && pullResult.data) {
            const serverPlans = pullResult.data.saasPlans || [];
            if (serverPlans.length > 0) {
              const formattedPlans = serverPlans.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price || 0),
                features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []),
                limits: (typeof p.limits === 'string' ? JSON.parse(p.limits) : p.limits) || { maxUsers: 5, maxProducts: 500, maxBranches: 2, maxInvoicesPerMonth: 1000 },
                isTrialDefault: p.isTrialDefault ?? false,
                synced: true,
              }));
              await localDb.saasPlans.bulkPut(formattedPlans);
            }
            const serverOrgs = pullResult.data.organizations || [];
            if (serverOrgs.length > 0) {
              await localDb.saasOrganizations.bulkPut(serverOrgs.map((o: any) => ({ ...o, synced: true })));
            }
          }
        } catch (e) {
          console.warn("Could not sync plans from cloud on auth:", e);
        }
      };
      syncCloudPlans();
    }
  }, [user?.orgId]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = localStorage.getItem("pos_auth_user");
        if (storedUserId) {
          const foundUser = await localDb.users.get(storedUserId);
          if (foundUser) {
            setUser(foundUser);
            if (foundUser.orgId) {
              const userSettings = await localDb.settings.where("orgId").equals(foundUser.orgId).first();
              setSettings(userSettings || await localDb.settings.get("default"));
              
              const org = await localDb.saasOrganizations.get(foundUser.orgId);
              if (org) {
                setSaasOrgState(org);
                const plan = await localDb.saasPlans.get(org.currentPlanId);
                if (plan) setSaasPlanState(plan);
              }
            } else {
              setSettings(await localDb.settings.get("default"));
            }
          } else {
            localStorage.removeItem("pos_auth_user");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (pin: string) => {
    try {
      // Find a user with the matching PIN
      const users = await localDb.users.toArray();
      const foundUser = users.find(u => u.pin === pin);

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem("pos_auth_user", foundUser.id);
        if (foundUser.orgId) {
          localStorage.setItem("pos_org_id", foundUser.orgId);
        }

        // Update last active
        await localDb.users.update(foundUser.id, { lastActive: new Date().toISOString() });

        if (foundUser.orgId) {
          const userSettings = await localDb.settings.where("orgId").equals(foundUser.orgId).first();
          setSettings(userSettings || await localDb.settings.get("default"));
          const org = await localDb.saasOrganizations.get(foundUser.orgId);
          if (org) {
            setSaasOrgState(org);
            const plan = await localDb.saasPlans.get(org.currentPlanId);
            if (plan) setSaasPlanState(plan);
          }
          
          // Log SaaS Session
          const sessionId = crypto.randomUUID();
          localStorage.setItem("pos_saas_session", sessionId);
          await localDb.saasSessions.add({
            id: sessionId,
            orgId: foundUser.orgId,
            userId: foundUser.id,
            loginAt: new Date().toISOString(),
            status: "live",
            device: navigator.userAgent
          });
        } else {
          setSettings(await localDb.settings.get("default"));
        }

        toast.success(`Welcome back, ${foundUser.name}`);
        router.navigate({ to: "/" });
        return true;
      } else {
        toast.error("Invalid PIN");
        return false;
      }
    } catch (error) {
      toast.error("Login failed due to system error");
      return false;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "superadmin@pos.com";
      const SUPER_ADMIN_PASS = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || "";

      // Super Admin special login
      if (email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        if (!SUPER_ADMIN_PASS || password !== SUPER_ADMIN_PASS) {
          toast.error("Invalid super admin credentials");
          return false;
        }
        const superAdminId = "superadmin-master-id";
        const superAdminUser: LocalUser = {
          id: superAdminId,
          orgId: "superadmin-org",
          name: "Super Admin",
          email: SUPER_ADMIN_EMAIL,
          role: "admin",
          status: "active",
          lastActive: new Date().toISOString(),
          pin: SUPER_ADMIN_PASS,
        };
        await localDb.users.put(superAdminUser);
        setUser(superAdminUser);
        localStorage.setItem("pos_auth_user", superAdminId);
        localStorage.setItem("pos_org_id", "superadmin-org");
        toast.success("Welcome, Super Admin!");
        router.navigate({ to: "/super-admin" });
        return true;
      }

      // Regular user: first check local DB
      const allUsers = await localDb.users.toArray();
      let foundUser = allUsers.find((u: LocalUser) => u.email?.toLowerCase() === email.toLowerCase().trim());

      // If not found locally, try fetching from Neon DB using targeted verification endpoint
      if (!foundUser) {
        try {
          const remoteResult = await verifyUserEmailFn({ data: { email } }) as any;
          if (remoteResult.success && remoteResult.data) {
            const remoteUser = remoteResult.data.user;
            if (remoteUser) {
              // Cache user locally
              const localUserData: LocalUser = {
                id: remoteUser.id,
                orgId: remoteUser.organizationId || remoteUser.orgId,
                name: remoteUser.name,
                email: remoteUser.email,
                role: remoteUser.role,
                status: remoteUser.status,
                lastActive: new Date().toISOString(),
                pin: remoteUser.pin,
                permissions: Array.isArray(remoteUser.permissions) ? remoteUser.permissions : (typeof remoteUser.permissions === 'string' ? JSON.parse(remoteUser.permissions) : undefined),
                emailVerified: remoteUser.emailVerified ?? true,
              };
              await localDb.users.put(localUserData);
              // Also cache organization
              const remoteOrg = remoteResult.data.organization;
              if (remoteOrg) {
                await localDb.saasOrganizations.put({
                  id: remoteOrg.id,
                  name: remoteOrg.name,
                  ownerEmail: remoteOrg.ownerEmail,
                  status: remoteOrg.status,
                  currentPlanId: remoteOrg.currentPlanId,
                  planExpiryDate: remoteOrg.planExpiryDate,
                  syncKey: remoteOrg.syncKey,
                  isOnline: remoteOrg.isOnline ?? true,
                });
              }
              if (remoteResult.data.settings) {
                const s = remoteResult.data.settings;
                await localDb.settings.put({
                  ...s,
                  id: s.id || "default",
                  orgId: s.organizationId || s.orgId || localUserData.orgId,
                  synced: true,
                });
              }
              if (remoteResult.data.plans && remoteResult.data.plans.length > 0) {
                const formattedPlans = remoteResult.data.plans.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  price: Number(p.price || 0),
                  features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []),
                  limits: (typeof p.limits === 'string' ? JSON.parse(p.limits) : p.limits) || { maxUsers: 5, maxProducts: 500, maxBranches: 2, maxInvoicesPerMonth: 1000 },
                  isTrialDefault: p.isTrialDefault ?? false,
                  synced: true,
                }));
                await localDb.saasPlans.bulkPut(formattedPlans);
              }
              foundUser = localUserData;
            }
          }
        } catch (e) {
          console.warn("Could not fetch user from cloud, offline mode");
        }
      }

      if (!foundUser) {
        toast.error("No account found. Please register your business.");
        return false;
      }

      // Verify password (stored as PIN)
      if (foundUser.pin && foundUser.pin.trim() !== password.trim()) {
        toast.error("Incorrect password");
        return false;
      }
        setUser(foundUser);
        localStorage.setItem("pos_auth_user", foundUser.id);
        if (foundUser.orgId) {
          localStorage.setItem("pos_org_id", foundUser.orgId);
        }
        await localDb.users.update(foundUser.id, { lastActive: new Date().toISOString() });
        if (foundUser.orgId) {
          const userSettings = await localDb.settings.where("orgId").equals(foundUser.orgId).first();
          setSettings(userSettings || await localDb.settings.get("default"));
          const org = await localDb.saasOrganizations.get(foundUser.orgId);
          if (org) {
            setSaasOrgState(org);
            const plan = await localDb.saasPlans.get(org.currentPlanId);
            if (plan) setSaasPlanState(plan);
          }
          
          // Log SaaS Session
          const sessionId = crypto.randomUUID();
          localStorage.setItem("pos_saas_session", sessionId);
          await localDb.saasSessions.add({
            id: sessionId,
            orgId: foundUser.orgId,
            userId: foundUser.id,
            loginAt: new Date().toISOString(),
            status: "live",
            device: navigator.userAgent
          });
        } else {
          setSettings(await localDb.settings.get("default"));
        }

      toast.success(`Welcome back, ${foundUser.name}`);
      router.navigate({ to: "/" });
      return true;
    } catch (error) {
      toast.error("Login failed");
      return false;
    }
  };

  const loginWithSocial = async (provider: "google" | "facebook") => {
    try {
      if (provider === "google" && GOOGLE_CLIENT_ID) {
        initiateGoogleOAuth();
        return true;
      }
      if (provider === "facebook" && FACEBOOK_APP_ID) {
        initiateFacebookOAuth();
        return true;
      }

      const mockEmail = provider === "google" ? "google.user@store.com" : "facebook.user@store.com";
      const mockName = provider === "google" ? "Google User" : "Facebook User";
      
      const users = await localDb.users.toArray();
      let foundUser = users.find(u => u.email === mockEmail);
      
      if (!foundUser) {
        const newId = `social-${Date.now()}`;
        const orgId = `org-${Date.now()}`;
        foundUser = {
          id: newId,
          orgId,
          name: mockName,
          email: mockEmail,
          role: "admin",
          status: "active",
          lastActive: new Date().toISOString(),
          pin: "1234"
        };
        await localDb.users.add(foundUser);
      }
      
      setUser(foundUser);
      localStorage.setItem("pos_auth_user", foundUser.id);
      localStorage.setItem("pos_org_id", foundUser.orgId || "");
      toast.success(`Logged in with ${provider === "google" ? "Google" : "Facebook"} successfully!`);
      router.navigate({ to: "/" });
      return true;
    } catch (err) {
      toast.error(`Failed to login with ${provider}`);
      return false;
    }
  };

  const logout = async () => {
    const sessionId = localStorage.getItem("pos_saas_session");
    if (sessionId) {
      await localDb.saasSessions.update(sessionId, { logoutAt: new Date().toISOString(), status: "ended" });
      localStorage.removeItem("pos_saas_session");
    }
    setUser(null);
    setSaasOrgState(null);
    setSaasPlanState(null);
    localStorage.removeItem("pos_auth_user");
    router.navigate({ to: "/login" });
  };

  const isTrialExpired = useMemo(() => {
    if (user?.email?.toLowerCase().includes("superadmin")) return false;
    const subStatus = saasOrg?.status || settings?.subscriptionStatus || "trial";
    if (subStatus === "active") return false;
    const expiryDateStr = saasOrg?.planExpiryDate || settings?.trialEndsAt;
    if (!expiryDateStr) return false;
    return new Date() > new Date(expiryDateStr);
  }, [saasOrg, settings, user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      loginWithEmail,
      loginWithSocial,
      logout,
      isLoading,
      isEmailVerified: user ? (user.emailVerified !== false || user.email?.toLowerCase().includes("superadmin")) : true,
      isTrialExpired,
      subscriptionStatus: saasOrg?.status || settings?.subscriptionStatus || "trial",
      saasOrg,
      saasPlan,
      settings
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
