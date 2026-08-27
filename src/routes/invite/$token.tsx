import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getInvitationFn, acceptInvitationFn } from "@/api/auth";
import { v4 as uuidv4 } from "uuid";
import { Store, CheckCircle2, Loader2 } from "lucide-react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept Invitation · OneDesk360 SaaS" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { errors, validate, validateSingleField, clearError } = useFormValidation({
    name: { required: "Name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } },
    email: { required: "Email is required", email: "Valid email is required" },
    password: {
      required: "Password is required",
      minLength: { value: 8, message: "Password must be at least 8 characters long" },
      pattern: {
        value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/,
        message: "Password must contain uppercase, lowercase, number and special character",
      },
    },
  });

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await getInvitationFn({ data: { token } });
        const inv = res.data;
        if (
          res.success &&
          inv &&
          inv.status === "pending" &&
          new Date(inv.expiresAt) > new Date()
        ) {
          setInvitation(inv);
        } else {
          toast.error("Invitation is invalid or has expired.");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to verify invitation");
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      validateSingleField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateSingleField(e.target.name, e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (!validate(formData)) {
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const res = await acceptInvitationFn({
        data: {
          invitationId: invitation.id,
          orgId: invitation.organizationId,
          role: invitation.role,
          permissions: invitation.permissions || [],
          name: formData.name,
          email: formData.email,
          pin: formData.password,
        },
      });
      if (!res.success) throw new Error(res.error || "Failed to complete registration");
      setIsSuccess(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete registration");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!invitation && !isSuccess) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md text-center p-8 bg-card border border-border shadow-soft rounded-2xl">
          <Store className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
          <p className="text-muted-foreground mb-6">
            This invitation link has expired or is invalid.
          </p>
          <Button onClick={() => navigate({ to: "/login" })}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border shadow-soft rounded-2xl overflow-hidden">
        <div className="bg-primary/5 p-6 border-b border-border text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary shadow-sm mb-4">
            <Store className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">You've been invited!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join your team as a{" "}
            <span className="font-semibold text-foreground capitalize">{invitation?.role}</span>
          </p>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <div className="text-center animate-in fade-in zoom-in-95">
              <CheckCircle2 className="size-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Registration Complete</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Your account has been created and is awaiting approval from the store owner. You
                will be able to log in once they approve it.
              </p>
              <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="John Doe"
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="john@example.com"
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={errors.email} />
              </div>
              <div className="space-y-2">
                <Label>Set your password</Label>
                <PasswordInput
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={errors.password} />
              </div>

              <Button type="submit" className="w-full mt-4" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept Invitation
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
