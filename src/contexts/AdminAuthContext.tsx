import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { loginSuperAdminFn, getSuperAdminSessionFn, logoutSuperAdminFn } from "@/api/admin/auth";

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string | null;
  organizationId: string | null;
}

interface AdminAuthContextType {
  user: SuperAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await getSuperAdminSessionFn({ data: {} });
        if (result.success && result.user && result.user.role === "super_admin") {
          setUser(result.user as SuperAdminUser);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await loginSuperAdminFn({ data: { email, password } });
      if (result.success && result.user) {
        if (result.user.role !== "super_admin") {
          toast.error("This portal is reserved for Super Admin users only.");
          return false;
        }
        setUser(result.user as SuperAdminUser);
        toast.success("Welcome to Super Admin Control Panel!");
        router.navigate({ to: "/admin/dashboard" as any });
        return true;
      } else {
        toast.error(result.error || "Invalid credentials");
        return false;
      }
    } catch (error) {
      console.error("Super Admin login error:", error);
      toast.error("Login failed. Please try again.");
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutSuperAdminFn({ data: {} });
    } catch {
      // Continue even if server logout fails
    } finally {
      setUser(null);
      router.navigate({ to: "/admin" as any });
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.role === "super_admin",
        isLoading,
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
