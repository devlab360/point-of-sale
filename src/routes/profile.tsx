import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { appName } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserFn, updateUserFn } from "@/api/users";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { COUNTRY_CODES, TIMEZONES, DATE_FORMATS } from "@/lib/formatters";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FieldError } from "@/components/ui/field-error";
import { useAuth } from "@/contexts/AuthContext";
import { FileUpload } from "@/components/ui/file-upload";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: `Profile · ${appName}` }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { language, setLanguage, t } = useLanguage();
  const { user: authUser, refreshUser } = useAuth();

  const queryClient = useQueryClient();

  const {
    data: userData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["userProfile", authUser?.id],
    queryFn: async () =>
      authUser?.id ? ((await getUserFn({ data: { id: authUser.id } })) as any)?.data || null : null,
    enabled: !!authUser?.id,
  });
  const dbProfile = userData;

  const defaultProfile = {
    id: authUser?.id || "me",
    name: authUser?.name || "",
    email: authUser?.email || "",
    phone: "",
    role: authUser?.role || "",
    location: "",
    joined: "",
    lastActive: new Date().toISOString(),
    status: "active" as const,
    countryCode: "+91",
    timeZone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    language: "en",
    pin: authUser?.pin || "",
    avatar: authUser?.avatar || "",
  };

  const [profile, setProfile] = useState(defaultProfile);

  useEffect(() => {
    if (dbProfile) {
      setProfile((p) => ({ ...defaultProfile, ...(dbProfile as any) }));
    } else if (authUser) {
      setProfile(defaultProfile);
    }
  }, [dbProfile, authUser?.id]);

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    if (profileErrors[key])
      setProfileErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!profile.name?.trim()) errors.name = "Full name is required";
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()))
      errors.email = "Enter a valid email address";
    if (profile.phone) {
      const clean = profile.phone.replace(/[\s\-\+\(\)]/g, "");
      if (!/^\d{10,15}$/.test(clean)) errors.phone = "Enter a valid 10-15 digit phone number";
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    try {
      setIsSaving(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await updateUserFn({ data: { id: authUser?.id || profile.id, updates: profile } });
      queryClient.invalidateQueries({ queryKey: ["userProfile", authUser?.id] });
      await refreshUser();
      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (profile.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (isProfileLoading) {
    return (
      <div className="page-container">
        <ProfileSkeleton />
      </div>
    );
  }

  if (isProfileError && !dbProfile) {
    return (
      <div className="page-container">
        <ErrorState
          onRetry={refetchProfile}
          title="Failed to load profile"
          description="Unable to fetch user profile details. Click below to retry."
        />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("profile") || "Your Profile"}
        description="Personal details and preferences."
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            {t("save")}
          </Button>
        }
      />
      <div className="w-full">
        <div className="rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="p-6 md:p-8 md:border-r border-border/80 bg-muted/10 text-center flex flex-col items-center justify-center">
              <div className="w-full flex justify-center mb-2">
                <FileUpload
                  variant="avatar"
                  label=""
                  description=""
                  value={profile.avatar || ""}
                  onChange={(url) => handleChange("avatar", url)}
                  folder="avatars"
                  maxSizeMB={2}
                />
              </div>
              <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
              <p className="text-xs text-muted-foreground font-semibold mt-1 capitalize">
                {profile.role} {profile.location ? `· ${profile.location.split(" ")[0]}` : ""}
              </p>
            </div>
            <div className="p-6 md:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-foreground">
                    Full name <span className="text-destructive">*</span>
                  </span>
                  <input
                    value={profile.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 ${profileErrors.name ? "border-destructive focus:border-destructive" : "border-border focus:border-ring"}`}
                  />
                  <FieldError message={profileErrors.name} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Email
                  </span>
                  <input
                    value={profile.email}
                    readOnly
                    disabled
                    className={`w-full rounded-lg border bg-muted text-muted-foreground cursor-not-allowed px-3 py-2 text-sm focus:outline-none ${profileErrors.email ? "border-destructive focus:border-destructive" : "border-border"}`}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Email cannot be changed as it is used for login.
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Phone
                  </span>
                  <input
                    value={profile.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 ${profileErrors.phone ? "border-destructive focus:border-destructive" : "border-border focus:border-ring"}`}
                  />
                  <FieldError message={profileErrors.phone} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Role
                  </span>
                  <input
                    value={profile.role}
                    onChange={(e) => handleChange("role", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Location
                  </span>
                  <input
                    value={profile.location || ""}
                    onChange={(e) => handleChange("location", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Joined
                  </span>
                  <input
                    value={profile.joined || ""}
                    onChange={(e) => handleChange("joined", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </label>

                {/* Dynamic Locale, Timezone, Date Format & Language Settings */}
                <div className="sm:col-span-2 pt-4 border-t border-border mt-2 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">
                    Localization & Regional Preferences
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        {t("countryCode")}
                      </span>
                      <SearchableSelect
                        value={profile.countryCode || "+880"}
                        onChange={(val) => handleChange("countryCode", val)}
                        options={COUNTRY_CODES.map((c) => ({
                          value: c.code,
                          label: `${c.flag} ${c.code} (${c.country})`,
                        }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        {t("language")}
                      </span>
                      <SearchableSelect
                        value={language}
                        onChange={(val) => {
                          const lang = val as any;
                          setLanguage(lang);
                          handleChange("language", lang);
                        }}
                        options={LANGUAGES.map((l) => ({
                          value: l.code,
                          label: `${l.flag} ${l.nativeName} (${l.label})`,
                        }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        {t("timezone")}
                      </span>
                      <SearchableSelect
                        value={profile.timeZone || "Asia/Dhaka"}
                        onChange={(val) => handleChange("timeZone", val)}
                        options={TIMEZONES.map((tz) => ({
                          value: tz.value,
                          label: tz.label,
                        }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        {t("dateFormat")}
                      </span>
                      <SearchableSelect
                        value={profile.dateFormat || "DD/MM/YYYY"}
                        onChange={(val) => handleChange("dateFormat", val)}
                        options={DATE_FORMATS.map((df) => ({
                          value: df.value,
                          label: df.label,
                        }))}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
