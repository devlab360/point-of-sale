import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Employees · Grocer.Pro" }] }),
  component: UsersPage,
});

function UsersPage() {
  const users = useLiveQuery(() => localDb.users.toArray()) || [];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Employees" 
        description="Cashiers, managers, and back-office staff." 
        primaryAction={{ label: "Invite Employee", onClick: () => toast.info("User management requires backend") }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Last Active</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">No employees added yet.</td>
                </tr>
              ) : (
                users.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                          {e.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold">{e.name}</div>
                          <div className="text-xs text-muted-foreground">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary"><Shield className="mr-1 size-3" />{e.role}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{e.lastActive ? new Date(e.lastActive).toLocaleString() : "Never"}</td>
                    <td className="px-4 py-3">
                      <Badge className={e.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{e.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
