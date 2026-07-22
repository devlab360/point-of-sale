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
  const { login, loginWithEmail, loginWithSocial } = useAuth();
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
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="w-full text-xs font-semibold" onClick={() => loginWithSocial("google")}>
                <svg className="mr-2 size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google
              </Button>
              <Button type="button" variant="outline" className="w-full text-xs font-semibold text-[#1877F2]" onClick={() => loginWithSocial("facebook")}>
                <svg className="mr-2 size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>
            </div>

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
