import React, { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Shield,
  LayoutDashboard,
  Store,
  Receipt,
  Layers,
  MessageCircle,
  BookOpen,
  Star,
  Users,
  LogOut,
  Menu,
  X,
  Database,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navGroups = [
    {
      groupTitle: "Core Operations",
      items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      groupTitle: "Tenants & Monetization",
      items: [
        { to: "/admin/tenants", label: "Stores & Tenants", icon: Store },
        { to: "/admin/payments", label: "Payment Approvals", icon: Receipt },
        { to: "/admin/plans", label: "SaaS Pricing Plans", icon: Layers },
      ],
    },
    {
      groupTitle: "Customer Operations",
      items: [
        { to: "/admin/support", label: "Support Inbox", icon: MessageCircle },
        { to: "/admin/help", label: "Help Center & Videos", icon: BookOpen },
        { to: "/admin/reviews", label: "Tenant Reviews", icon: Star },
        { to: "/admin/users", label: "Super Admin Users", icon: Users },
      ],
    },
  ];

  const getPageTitle = () => {
    if (location.pathname === "/admin" || location.pathname === "/admin/")
      return "Super Admin Control Portal";
    if (location.pathname.startsWith("/admin/dashboard")) return "SaaS Platform Dashboard";
    if (location.pathname.startsWith("/admin/tenants")) return "Tenant Stores & Organizations";
    if (location.pathname.startsWith("/admin/payments")) return "Subscription Payment Approvals";
    if (location.pathname.startsWith("/admin/plans")) return "SaaS Pricing Tiers";
    if (location.pathname.startsWith("/admin/support")) return "Support Helpdesk & Tickets";
    if (location.pathname.startsWith("/admin/help")) return "Help Center & Documentation";
    if (location.pathname.startsWith("/admin/reviews")) return "Merchant Reviews & Ratings";
    if (location.pathname.startsWith("/admin/users")) return "Super Admin System Users";
    return "Super Admin Center";
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-card border-r flex-col shadow-sm z-20 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-foreground">
                  OneDesk360
                </h1>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                SaaS Control Center
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.groupTitle}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to !== "/admin/dashboard" && location.pathname.startsWith(item.to));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`size-4 transition-transform group-hover:scale-110 ${
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t bg-muted/20 space-y-2.5">
          <div className="p-2.5 rounded-xl border border-border/80 bg-card/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-foreground">Local PostgreSQL</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              ONLINE
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                SA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.name || "Super Admin"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email || "admin@saas.com"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
              onClick={logout}
              title="Logout Super Admin"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        {/* Top Navigation Header */}
        <header className="h-16 border-b bg-card px-4 lg:px-6 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {getPageTitle()}
              </h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                SaaS Tenant & Platform Administration Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-2">
              <a href="/">
                <Building2 className="size-3.5" />
                <span>Go to Store POS</span>
              </a>
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
