import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, UserCircle2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · Grocer.Pro" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"pin" | "email">("email");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinLogin = async () => {
    if (pin.length !== 4) return;
    const success = await login(pin);
    if (!success) {
      setPin("");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginWithEmail(email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Grocer.Pro SaaS</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "pin" ? "Enter your PIN to access the register" : "Sign in to your store dashboard"}
          </p>
        </div>

        {mode === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@store.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full mt-2">Sign In</Button>
            
            <div className="pt-4 text-center text-sm text-muted-foreground">
              Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Register your business</Link>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-8 flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`size-4 rounded-full transition-colors ${
                    i < pin.length ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-16 text-2xl font-semibold"
                  onClick={() => handleKeyPress(num.toString())}
                >
                  {num}
                </Button>
              ))}
              <Button variant="outline" className="h-16 text-xl font-medium text-muted-foreground" onClick={handleDelete}>
                Del
              </Button>
              <Button variant="outline" className="h-16 text-2xl font-semibold" onClick={() => handleKeyPress("0")}>
                0
              </Button>
              <Button className="h-16 text-xl font-medium" onClick={handlePinLogin} disabled={pin.length !== 4}>
                Go
              </Button>
            </div>
          </>
        )}

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setMode(mode === "pin" ? "email" : "pin")} className="text-xs text-muted-foreground">
            {mode === "pin" ? (
              <><UserCircle2 className="size-4 mr-2" /> Owner Sign In (Email)</>
            ) : (
              <><KeyRound className="size-4 mr-2" /> Terminal Sign In (PIN)</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
