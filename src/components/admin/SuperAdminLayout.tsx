import React, { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingPaymentsFn } from "@/api/admin/subscription-payments";
import { updateSuperAdminProfileAdminFn } from "@/api/admin/super-admin";
import {
  Shield,
  LayoutGrid,
  Store,
  Receipt,
  Layers,
  MessageCircle,
  BookOpen,
  Star,
  Users,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Home,
  Grid3x3,
  Loader2,
  Lock,
  Megaphone,
  User,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Settings,
  Search,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { LogoutConfirmDialog } from "@/components/layout/LogoutConfirmDialog";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function pathToCrumbs(pathname: string) {
  if (pathname === "/admin/dashboard" || pathname === "/admin") {
    return [
      { label: "Super Admin", to: "/admin/dashboard" },
      { label: "Dashboard", to: "/admin/dashboard" },
    ];
  }
  const parts = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  return [
    { label: "Super Admin", to: "/admin/dashboard" },
    ...parts.map((p, i) => ({
      label: p.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      to: "/admin/" + parts.slice(0, i + 1).join("/"),
    })),
  ];
}

const MOBILE_NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/admin/tenants", label: "Stores", icon: Store },
  { to: "/admin/payments", label: "Payments", icon: Receipt },
  { to: "/admin/support", label: "Support", icon: MessageCircle },
] as const;

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated, isLoading } = useAdminAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Profile & Password Drawer State
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("superAdminSidebarMinimized") === "true";
    }
    return false;
  });

  useEffect(() => {
    setTheme(getInitialTheme());
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin" && pathname !== "/admin/") {
      navigate({ to: "/admin" as any });
    }
  }, [isLoading, isAuthenticated, pathname, navigate]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
    }
  }, [user]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem("superAdminSidebarMinimized", String(newState));
  };

  const { data: paymentsData } = useQuery({
    queryKey: ["subscription-payments"],
    queryFn: () => getPendingPaymentsFn({ data: {} }),
  });

  const pendingPaymentsCount =
    (paymentsData?.data as any[])?.filter((p: any) => p.status === "pending").length || 0;

  const updateProfileMutation = useMutation({
    mutationFn: (payload: {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }) => updateSuperAdminProfileAdminFn({ data: payload }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Super Administrator credentials updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsProfileDrawerOpen(false);
        queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      } else {
        toast.error(res.error || "Failed to update profile");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to update profile"),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    updateProfileMutation.mutate({
      name: profileName,
      email: profileEmail,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
    });
  };

  const navGroups = [
    {
      groupTitle: "SaaS Platform & Tenants",
      items: [
        {
          label: "Tenant Stores & Orgs",
          to: "/admin/tenants",
          icon: Store,
        },
        {
          label: "SaaS Plans & Quotas",
          to: "/admin/plans",
          icon: Layers,
        },
      ],
    },
    {
      groupTitle: "Billing & Gateways",
      items: [
        {
          label: "Payment Approvals",
          to: "/admin/payments",
          icon: Receipt,
          badge: pendingPaymentsCount > 0 ? String(pendingPaymentsCount) : undefined,
          badgeVariant: "destructive" as const,
        },
      ],
    },
    {
      groupTitle: "Help Desk & Feedback",
      items: [
        {
          label: "Support Inbox",
          to: "/admin/support",
          icon: MessageCircle,
        },
        {
          label: "Merchant Reviews",
          to: "/admin/reviews",
          icon: Star,
        },
        {
          label: "Help Center & FAQs",
          to: "/admin/help",
          icon: BookOpen,
        },
        {
          label: "Broadcast Notices",
          to: "/admin/announcements",
          icon: Megaphone,
        },
      ],
    },
    {
      groupTitle: "Platform Personnel",
      items: [
        {
          label: "Super Admin Users",
          to: "/admin/users",
          icon: Users,
        },
      ],
    },
  ];

  const crumbs = pathToCrumbs(pathname);
  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "SA";

  const isMobileNavActive = (to: string) => {
    if (to === "/admin/dashboard") return pathname === "/admin/dashboard";
    return pathname.startsWith(to);
  };

  const isOnMainMobileNav = MOBILE_NAV_ITEMS.some((i) => isMobileNavActive(i.to));
  const isDashboardActive = pathname === "/admin/dashboard" || pathname === "/admin";

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Collapsible Sidebar (Matching Store Admin AppSidebar EXACTLY) */}
      <aside
        className={cn(
          "relative hidden md:flex h-full flex-col bg-card text-sidebar-foreground select-none transition-all duration-300 z-20 border-r border-border/80 shadow-xs",
          isMinimized ? "w-[4.75rem]" : "w-64",
        )}
      >
        {/* Floating Minimize Toggle Button matching AppSidebar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleMinimize}
              className={cn(
                "absolute -right-3.5 top-6 z-50 hidden lg:flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground hover:scale-110 active:scale-95",
                isMinimized && "rotate-180",
              )}
              aria-label={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronLeft className="size-4" strokeWidth={2.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-semibold text-xs">
            {isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
          </TooltipContent>
        </Tooltip>

        {/* Brand Header matching Store Admin AppSidebar */}
        {isMinimized ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/dashboard"
                className="flex h-20 shrink-0 items-center justify-center border-b border-border/70 bg-card px-0 cursor-pointer hover:bg-muted/30 transition-colors group"
              >
                <div className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-black text-[#B58D4C] border border-[#B58D4C]/30 shadow-xs overflow-hidden font-serif font-black text-sm tracking-wider group-hover:scale-105 transition-transform">
                  <Shield className="size-6 text-[#B58D4C]" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              ONEDESK360 · SUPER ADMIN
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/admin/dashboard"
            className="flex h-20 shrink-0 items-center gap-3 border-b border-border/70 bg-card px-4 cursor-pointer hover:bg-muted/30 transition-colors group"
          >
            <div className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-black text-[#B58D4C] border border-[#B58D4C]/30 shadow-xs overflow-hidden font-serif font-black text-sm tracking-wider group-hover:scale-105 transition-transform">
              <Shield className="size-6 text-[#B58D4C]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-serif text-base font-bold tracking-wide text-foreground group-hover:text-primary transition-colors uppercase">
                <span>ONEDESK360</span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B58D4C] mt-0.5 flex items-center gap-1">
                <span>SUPER ADMIN PANEL</span>
              </div>
            </div>
          </Link>
        )}

        {/* Main Nav Scroll View matching AppSidebar */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-1">
          {/* Top-Level Prominent Dashboard Button */}
          {isMinimized ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/dashboard"
                  className={cn(
                    "flex items-center justify-center rounded-xl py-3 text-[14.5px] font-bold transition-all duration-150 shadow-xs px-0",
                    isDashboardActive
                      ? "bg-[#B58D4C] text-white shadow-sm"
                      : "bg-muted/30 text-foreground hover:bg-muted/60",
                  )}
                >
                  <LayoutGrid className={cn("size-5 shrink-0 stroke-[2]", isDashboardActive ? "text-white" : "text-foreground/80")} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-bold text-xs">
                Dashboard
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/admin/dashboard"
              className={cn(
                "flex items-center rounded-xl py-3 text-[14.5px] font-bold transition-all duration-150 shadow-xs gap-3 px-3.5",
                isDashboardActive
                  ? "bg-[#B58D4C] text-white shadow-sm"
                  : "bg-muted/30 text-foreground hover:bg-muted/60",
              )}
            >
              <LayoutGrid className={cn("size-5 shrink-0 stroke-[2]", isDashboardActive ? "text-white" : "text-foreground/80")} />
              <span>Executive Dashboard</span>
            </Link>
          )}

          {/* Categorized Operational Groups */}
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="pt-2.5">
              {!isMinimized && (
                <div className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground/80">
                  {group.groupTitle}
                </div>
              )}

              <div className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.to ||
                    (item.to !== "/admin/dashboard" && pathname.startsWith(item.to));
                  const Icon = item.icon;

                  if (isMinimized) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.to as any}
                            className={cn(
                              "relative flex size-10 mx-auto items-center justify-center rounded-xl transition-all",
                              isActive
                                ? "bg-[#B58D4C] text-white shadow-xs"
                                : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                            )}
                          >
                            <Icon className={cn("size-5 stroke-[1.6]", isActive ? "text-white" : "text-foreground/75")} />
                            {item.badge && (
                              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-semibold text-xs">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      className={cn(
                        "group flex items-center justify-between rounded-xl py-2.5 text-[14px] font-medium transition-all duration-150 cursor-pointer gap-3 px-3",
                        isActive
                          ? "bg-[#B58D4C] text-white font-semibold shadow-xs"
                          : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={cn("size-5 shrink-0 stroke-[1.6]", isActive ? "text-white" : "text-foreground/75")} />
                        <span className="truncate text-left">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Profile matching AppSidebar */}
        <div className="shrink-0 border-t border-border/80 bg-card p-3">
          <div
            className={cn(
              "flex items-center rounded-xl border border-border/80 bg-background/60 p-2.5 shadow-2xs transition-all duration-150 hover:border-primary/30",
              isMinimized ? "flex-col p-1.5 gap-1.5" : "gap-2.5",
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsProfileDrawerOpen(true)}
                  className={cn(
                    "flex items-center min-w-0 flex-1 cursor-pointer transition-opacity hover:opacity-80 text-left",
                    isMinimized ? "flex-col gap-1.5" : "gap-2.5",
                  )}
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#B58D4C]/15 border border-[#B58D4C]/30 text-xs font-bold text-[#B58D4C]">
                    {initials}
                  </div>
                  {!isMinimized && (
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs sm:text-sm font-bold text-foreground">
                        {user?.name || "Super Admin"}
                      </div>
                      <div className="truncate text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="size-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        <span className="capitalize">Super Administrator</span>
                      </div>
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Admin Profile & Security</TooltipContent>
            </Tooltip>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutConfirm(true)}
              className={cn(
                "shrink-0 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive",
                isMinimized ? "size-8 w-full" : "size-7.5",
              )}
              title="Log out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header matching Store Admin AppHeader EXACTLY */}
        <header className="sticky top-0 z-30 flex h-14 md:h-16 shrink-0 items-center gap-2 md:gap-3 border-b border-border bg-background/80 px-3 md:px-4 backdrop-blur-xl lg:px-6 shadow-2xs">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:flex lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Breadcrumb Navigation matching AppHeader */}
          <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center md:flex">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="flex items-center gap-1.5">
                <Link to="/admin/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Home className="size-3.5 text-muted-foreground/70" />
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={c.to} className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/50">/</span>
                  {i === crumbs.length - 1 ? (
                    <span className="font-semibold text-foreground truncate">{c.label}</span>
                  ) : (
                    <Link
                      to={c.to as any}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2.5 md:flex-none">
            {/* Quick POS Terminal link */}
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex shadow-xs h-9 text-xs font-semibold gap-1.5">
              <Link to="/pos">
                <Store className="size-3.5 text-[#B58D4C]" />
                <span>Store POS</span>
                <ExternalLink className="size-3 text-muted-foreground" />
              </Link>
            </Button>

            {/* Fullscreen Toggle Button matching AppHeader */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F11)" : "Full Screen (F11)"}
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground hidden sm:flex"
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </Button>

            {/* Theme Toggle Button matching AppHeader */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1 text-left hover:bg-accent transition-colors focus:outline-none">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#B58D4C]/15 border border-[#B58D4C]/30 text-xs font-bold text-[#B58D4C]">
                    {initials}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold leading-none">{user?.name || "Super Admin"}</p>
                    <p className="text-[11px] leading-none text-muted-foreground">
                      {user?.email || "admin@superadmin.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsProfileDrawerOpen(true)}
                  className="cursor-pointer text-xs font-semibold"
                >
                  <User className="size-3.5 mr-2 text-[#B58D4C]" /> Admin Profile & Password
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/dashboard" className="cursor-pointer text-xs">
                    <LayoutGrid className="size-3.5 mr-2" /> Dashboard Overview
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/tenants" className="cursor-pointer text-xs">
                    <Store className="size-3.5 mr-2" /> Tenant Stores & Orgs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/payments" className="cursor-pointer text-xs">
                    <Receipt className="size-3.5 mr-2" /> Payment Approvals
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/users" className="cursor-pointer text-xs">
                    <Users className="size-3.5 mr-2" /> Platform Personnel
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowLogoutConfirm(true)}
                  className="cursor-pointer text-xs text-destructive focus:text-destructive"
                >
                  <LogOut className="size-3.5 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Canvas Matching Store AppLayout */}
        <main className="flex-1 overflow-y-auto bg-muted/20 relative bottom-nav-spacer">
          <div className="page-enter">
            {isLoading ? (
              <div className="flex h-[70vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-[#B58D4C]" />
              </div>
            ) : (
              children
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar Matching BottomNav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-border bg-card/95 backdrop-blur-xl shadow-bottom-nav md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          role="navigation"
          aria-label="Super Admin Mobile Navigation"
        >
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isMobileNavActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as any}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-semibold transition-colors touch-target",
                  active ? "text-[#B58D4C]" : "text-muted-foreground active:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl px-4 py-1 transition-all",
                    active && "bg-[#B58D4C]/12",
                  )}
                >
                  <Icon
                    className={cn("size-5", active && "text-[#B58D4C]")}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span className="leading-none">{item.label}</span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[#B58D4C]" />
                )}
              </Link>
            );
          })}

          {/* More Drawer Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-semibold transition-colors touch-target",
              mobileMenuOpen || !isOnMainMobileNav
                ? "text-[#B58D4C]"
                : "text-muted-foreground active:text-foreground",
            )}
            aria-label="More navigation options"
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-xl px-4 py-1 transition-all",
                (mobileMenuOpen || !isOnMainMobileNav) && "bg-[#B58D4C]/12",
              )}
            >
              <Grid3x3
                className={cn("size-5", (mobileMenuOpen || !isOnMainMobileNav) && "text-[#B58D4C]")}
                strokeWidth={mobileMenuOpen || !isOnMainMobileNav ? 2.5 : 2}
              />
            </div>
            <span className="leading-none">More</span>
            {(mobileMenuOpen || !isOnMainMobileNav) && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[#B58D4C]" />
            )}
          </button>
        </nav>
      </div>

      {/* Mobile Drawer (Matching Store Admin Drawer) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
          <SheetTitle className="sr-only">Super Admin Navigation</SheetTitle>
          <div className="flex h-20 items-center px-4 border-b">
            <div className="flex items-center gap-3">
              <div className="relative grid size-10 place-items-center rounded-lg bg-black text-[#B58D4C] border border-[#B58D4C]/30 shadow-xs font-serif font-black text-sm">
                <Shield className="size-5 text-[#B58D4C]" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-serif uppercase text-foreground">ONEDESK360</h3>
                <p className="text-[10px] font-black text-[#B58D4C] tracking-wider uppercase">SUPER ADMIN</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsProfileDrawerOpen(true);
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold bg-[#B58D4C]/10 text-[#B58D4C] hover:bg-[#B58D4C]/15 transition-colors"
              >
                <User className="size-4" />
                <span>Admin Profile & Password</span>
              </button>
            </div>

            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <h4 className="px-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">
                  {group.groupTitle}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.to ||
                      (item.to !== "/admin/dashboard" && pathname.startsWith(item.to));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to as any}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                          isActive
                            ? "bg-[#B58D4C] text-white font-semibold shadow-xs"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge
                            variant={item.badgeVariant || "secondary"}
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 min-w-4 font-bold",
                              isActive ? "bg-white text-[#B58D4C]" : "",
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full text-xs text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
            >
              <LogOut className="size-4" /> Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Super Admin Profile & Password Management Drawer */}
      <Sheet open={isProfileDrawerOpen} onOpenChange={setIsProfileDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <User className="size-5 text-[#B58D4C]" />
              <span>Super Admin Profile & Security</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              Update administrative account credentials and change your master password.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleProfileSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Account Identity Card */}
              <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-black text-[#B58D4C] border border-[#B58D4C]/30 text-sm font-black shadow-md">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-foreground">{user?.name || "Super Administrator"}</span>
                      <Badge className="bg-[#B58D4C]/15 text-[#B58D4C] border-[#B58D4C]/30 text-[10px] font-bold">
                        Root Access
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px] flex justify-between text-muted-foreground">
                  <span>Session Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Authenticated via JWT
                  </span>
                </div>
              </div>

              {/* General Profile Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Personal Details
                </h4>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-name">Full Name</Label>
                  <Input
                    id="prof-name"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Super Admin Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-email">Email Address</Label>
                  <Input
                    id="prof-email"
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="admin@superadmin.com"
                  />
                </div>
              </div>

              {/* Password Change Section */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-[#B58D4C]" />
                    <span>Change Master Password</span>
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Leave blank to keep unchanged</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="curr-pw">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="curr-pw"
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Required only if changing password"
                      className="pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-pw">New Master Password</Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conf-pw">Confirm New Password</Label>
                  <Input
                    id="conf-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new master password"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsProfileDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Updating…" : "Save Profile & Security"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={logout}
      />
    </div>
  );
}

