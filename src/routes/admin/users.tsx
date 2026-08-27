import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Users, Shield, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Super Admin Users · OneDesk360" }] }),
  component: SuperAdminUsersPage,
});

function SuperAdminUsersPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Super Admin Platform Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage global administrators with platform-wide privileges
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">Super Administrator</h3>
                <Badge className="bg-primary/20 text-primary">Master Role</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Full system control, multi-tenant access, pricing configuration</p>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
