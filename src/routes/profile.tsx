import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { COUNTRY_CODES, TIMEZONES, DATE_FORMATS } from "@/lib/formatters";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
  status: "active",
  countryCode: "+880",
  timeZone: "Asia/Dhaka",
  dateFormat: "DD/MM/YYYY",
  language: "en"
};

function ProfilePage() {
  const { language, setLanguage, t } = useLanguage();
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
        title={t("profile") || "Your Profile"} 
        description="Personal details and preferences." 
        actions={<Button onClick={handleSave}>{t("save")}</Button>} 
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

            {/* Dynamic Locale, Timezone, Date Format & Language Settings */}
            <div className="sm:col-span-2 pt-4 border-t border-border mt-2 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Localization & Regional Preferences</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("countryCode")}</span>
                  <SearchableSelect 
                    value={profile.countryCode || "+880"} 
                    onChange={val => handleChange('countryCode', val)}
                    options={COUNTRY_CODES.map(c => ({
                      value: c.code,
                      label: `${c.flag} ${c.code} (${c.country})`
                    }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("language")}</span>
                  <SearchableSelect 
                    value={language} 
                    onChange={val => {
                      const lang = val as any;
                      setLanguage(lang);
                      handleChange('language', lang);
                    }}
                    options={LANGUAGES.map(l => ({
                      value: l.code,
                      label: `${l.flag} ${l.nativeName} (${l.label})`
                    }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("timezone")}</span>
                  <SearchableSelect 
                    value={profile.timeZone || "Asia/Dhaka"} 
                    onChange={val => handleChange('timeZone', val)}
                    options={TIMEZONES.map(tz => ({
                      value: tz.value,
                      label: tz.label
                    }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("dateFormat")}</span>
                  <SearchableSelect 
                    value={profile.dateFormat || "DD/MM/YYYY"} 
                    onChange={val => handleChange('dateFormat', val)}
                    options={DATE_FORMATS.map(df => ({
                      value: df.value,
                      label: df.label
                    }))}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
