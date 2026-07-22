import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { localDb, type LocalUser } from "@/lib/db";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface AuthContextType {
  user: LocalUser | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
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
      const foundUser = users.find(u => u.email === email && u.role === "admin");
      
      if (foundUser) {
        // We simulate password check by assuming success if email matches for now
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
        router.navigate({ to: "/" });
        return true;
      } else {
        toast.error("Invalid credentials or you are not an Admin.");
        return false;
      }
    } catch (error) {
      toast.error("Login failed");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pos_auth_user");
    router.navigate({ to: "/login" });
  };

  const isTrialExpired = useMemo(() => {
    if (!settings || !settings.trialEndsAt) return false;
    if (settings.subscriptionStatus === "active") return false;
    return new Date() > new Date(settings.trialEndsAt);
  }, [settings]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      loginWithEmail, 
      logout, 
      isLoading,
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
