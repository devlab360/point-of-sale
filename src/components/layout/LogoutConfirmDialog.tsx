import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  userName?: string;
  userEmail?: string;
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  userName,
  userEmail,
}: LogoutConfirmDialogProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-2xl bg-card">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/25 shrink-0">
              <LogOut className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {t("confirmSignOut", "Confirm Sign Out")}
              </DialogTitle>
              {(userName || userEmail) && (
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {t("currentlySignedInAs", "Currently signed in as")}{" "}
                  <span className="font-semibold text-foreground">{userName || userEmail}</span>
                </p>
              )}
            </div>
          </div>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {t(
              "confirmSignOutDesc",
              "Are you sure you want to end your current session? You will need to enter your credentials to log back in.",
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold h-9 px-4"
          >
            {t("staySignedIn", "Stay Signed In")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading}
            onClick={handleConfirm}
            className="rounded-xl text-xs font-bold h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5 mr-1.5" />
            )}
            {t("signOut", "Sign Out")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
