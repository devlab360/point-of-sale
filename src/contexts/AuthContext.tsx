import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { localDb, type LocalUser } from "@/lib/db";
import { initiateGoogleOAuth, initiateFacebookOAuth, GOOGLE_CLIENT_ID, FACEBOOK_APP_ID } from "@/lib/auth-social";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const router = useRouter();

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
              if (userSettings) setSettings(userSettings);
              else {
                const defaultSetting = await localDb.settings.get("default");
                setSettings(defaultSetting);
              }
            } else {
              const defaultSetting = await localDb.settings.get("default");
              setSettings(defaultSetting);
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
      const users = await localDb.users.toArray();
      let foundUser = users.find((u: LocalUser) => u.email?.toLowerCase() === email.toLowerCase().trim());

      // Auto-provision Super Admin account on first login
      if (!foundUser && email.toLowerCase().includes("superadmin")) {
        const superAdminId = "superadmin-master-id";
        foundUser = {
          id: superAdminId,
          orgId: "superadmin-org",
          name: "Super Admin",
          email: email.trim(),
          role: "admin",
          status: "active",
          lastActive: new Date().toISOString(),
          pin: "9999",
        };
        await localDb.users.put(foundUser);
      }

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem("pos_auth_user", foundUser.id);
        if (foundUser.orgId) {
          localStorage.setItem("pos_org_id", foundUser.orgId);
        }
        await localDb.users.update(foundUser.id, { lastActive: new Date().toISOString() });
        if (foundUser.orgId) {
          const userSettings = await localDb.settings.where("orgId").equals(foundUser.orgId).first();
          setSettings(userSettings || await localDb.settings.get("default"));
        } else {
          setSettings(await localDb.settings.get("default"));
        }

        toast.success(`Welcome back, ${foundUser.name}`);
        if (email.toLowerCase().includes("superadmin")) {
          router.navigate({ to: "/super-admin" });
        } else {
          router.navigate({ to: "/" });
        }
        return true;
      } else {
        toast.error("Invalid credentials. Please register your business.");
        return false;
      }
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pos_auth_user");
    router.navigate({ to: "/login" });
  };

  const isTrialExpired = useMemo(() => {
    if (user?.email?.toLowerCase().includes("superadmin")) return false;
    if (!settings || !settings.trialEndsAt) return false;
    if (settings.subscriptionStatus === "active") return false;
    return new Date() > new Date(settings.trialEndsAt);
  }, [settings, user]);

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
      subscriptionStatus: settings?.subscriptionStatus || "trial"
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
