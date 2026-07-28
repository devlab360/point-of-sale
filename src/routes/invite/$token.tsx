import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { localDb, type LocalInvitation } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Store, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept Invitation · Grocer.Pro SaaS" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  
  const [invitation, setInvitation] = useState<LocalInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pin: "",
    password: ""
  });

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const inv = await localDb.invitations.where("token").equals(token).first();
        if (inv && inv.status === "pending" && new Date(inv.expiresAt) > new Date()) {
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (formData.pin.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await localDb.users.add({
        id: uuidv4(),
        orgId: invitation.orgId,
        name: formData.name,
        email: formData.email,
        role: invitation.role,
        permissions: invitation.permissions || [],
        status: "pending",
        lastActive: new Date().toISOString(),
        pin: formData.pin
      });

      await localDb.invitations.update(invitation.id, { status: "accepted" });
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
          <p className="text-muted-foreground mb-6">This invitation link has expired or is invalid.</p>
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
          <p className="text-sm text-muted-foreground mt-1">Join your team as a <span className="font-semibold text-foreground capitalize">{invitation?.role}</span></p>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <div className="text-center animate-in fade-in zoom-in-95">
              <CheckCircle2 className="size-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Registration Complete</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Your account has been created and is awaiting approval from the store owner. 
                You will be able to log in once they approve it.
              </p>
              <Button className="w-full" onClick={() => navigate({ to: "/login" })}>Return to Login</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Set your password / PIN</Label>
                <PasswordInput name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Set POS PIN (4 Digits)</Label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} name="pin" value={formData.pin} onChange={handleChange} required placeholder="1234" />
                <p className="text-xs text-muted-foreground">You will use this PIN to quickly sign in at the terminal.</p>
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
