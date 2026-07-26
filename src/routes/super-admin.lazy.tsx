import { createLazyFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createLazyFileRoute("/super-admin")({
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const { user } = useAuth();
  
  if (user?.email?.toLowerCase().indexOf("superadmin") === -1) {
    return <div className="p-8 text-center text-red-500 font-bold">Unauthorized. Super Admin Only.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 flex-1 w-full bg-muted/20">
      <Outlet />
    </div>
  );
}
