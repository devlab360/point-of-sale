import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSettingsFn } from "@/api/settings";
import { useAuth } from "@/contexts/AuthContext";

export function CheckoutModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [card, setCard] = useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  });

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;

    if (name === "number") {
      value = value.replace(/\D/g, "").substring(0, 16);
      value = value.replace(/(\d{4})/g, "$1 ").trim();
    } else if (name === "expiry") {
      value = value.replace(/\D/g, "").substring(0, 4);
      if (value.length > 2) {
        value = `${value.substring(0, 2)}/${value.substring(2)}`;
      }
    } else if (name === "cvc") {
      value = value.replace(/\D/g, "").substring(0, 4);
    }

    setCard({ ...card, [name]: value });
  };

  const queryClient = useQueryClient();

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (card.number.length < 19 || card.expiry.length < 5 || card.cvc.length < 3 || !card.name) {
      toast.error("Please fill in all card details correctly");
      return;
    }

    setIsProcessing(true);

    // Simulate API delay for Stripe/SSLCommerz processing
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      if (user?.orgId) {
        await updateSettingsFn({ data: { updates: { subscriptionStatus: "active" } } });
      } else {
        await updateSettingsFn({ data: { updates: { subscriptionStatus: "active" } } });
      }
      queryClient.invalidateQueries({ queryKey: ["settings"] });

      setIsProcessing(false);
      setIsSuccess(true);
      toast.success("Payment successful! Your subscription is now active.");

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setIsSuccess(false);
        setCard({ number: "", name: "", expiry: "", cvc: "" });
      }, 2000);
    } catch (error) {
      setIsProcessing(false);
      toast.error("Payment failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isProcessing && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" /> Secure Checkout
          </DialogTitle>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
            <div className="rounded-full bg-success/10 p-3 mb-4">
              <CheckCircle2 className="size-12 text-success" />
            </div>
            <h3 className="text-xl font-bold">Payment Successful</h3>
            <p className="text-muted-foreground text-sm mt-2 text-center">
              Thank you for subscribing! Your account is now fully active.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Amount due</p>
                  <p className="text-2xl font-black">
                    $29.00<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>
                <CreditCard className="size-6 text-primary" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Card Number</Label>
                  <div className="relative">
                    <Input
                      name="number"
                      value={card.number}
                      onChange={handleCardChange}
                      placeholder="0000 0000 0000 0000"
                      className="pl-10 font-mono tracking-widest"
                      required
                    />
                    <CreditCard className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cardholder Name</Label>
                  <Input
                    name="name"
                    value={card.name}
                    onChange={handleCardChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      name="expiry"
                      value={card.expiry}
                      onChange={handleCardChange}
                      placeholder="MM/YY"
                      className="font-mono tracking-widest"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CVC</Label>
                    <Input
                      name="cvc"
                      value={card.cvc}
                      onChange={handleCardChange}
                      placeholder="123"
                      className="font-mono tracking-widest"
                      type="password"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay $29.00"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1 mt-2">
              <Lock className="size-3" /> Payments are secure and encrypted.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
