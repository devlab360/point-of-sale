import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { employees } from "@/lib/dummy";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Employees · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Employees" description="Cashiers, managers, and back-office staff." primaryAction={{ label: "Invite Employee" }}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Shift</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((e) => (
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
                  <td className="px-4 py-3 text-muted-foreground">{e.shift}</td>
                  <td className="px-4 py-3">
                    <Badge className={e.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  ),
});
