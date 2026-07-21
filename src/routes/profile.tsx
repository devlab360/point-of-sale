import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · Grocer.Pro" }] }),
  component: ProfilePage,
});

const defaultProfile = {
  id: "me",
  name: "",
  email: "",
  phone: "",
  role: "",
  location: "",
  joined: "",
  lastActive: new Date().toISOString(),
  status: "active"
};

function ProfilePage() {
  const dbProfile = useLiveQuery(() => localDb.users.get("me"));
  const [profile, setProfile] = useState(defaultProfile);

  useEffect(() => {
    if (dbProfile) {
      setProfile(dbProfile as any);
    }
  }, [dbProfile]);

  const handleChange = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await localDb.users.put({ ...profile, id: "me" });
      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Failed to update profile.");
    }
  };

  const initials = (profile.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();


  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader 
        title="Your Profile" 
        description="Personal details and preferences." 
        actions={<Button onClick={handleSave}>Save changes</Button>} 
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
          <h2 className="mt-4 text-lg font-bold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.role} · {profile.location?.split(' ')[0]}</p>
          <Button variant="outline" size="sm" className="mt-4">Change photo</Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Full name</span>
              <input value={profile.name} onChange={e => handleChange('name', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email</span>
              <input value={profile.email} onChange={e => handleChange('email', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Phone</span>
              <input value={profile.phone || ""} onChange={e => handleChange('phone', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Role</span>
              <input value={profile.role} onChange={e => handleChange('role', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Location</span>
              <input value={profile.location || ""} onChange={e => handleChange('location', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Joined</span>
              <input value={profile.joined || ""} onChange={e => handleChange('joined', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
