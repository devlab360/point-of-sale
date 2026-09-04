import { useState, useEffect } from "react";
import { appName } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Smartphone, CheckCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

export function InstallAppButton() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA already
    if (typeof window !== "undefined") {
      const isPwa =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isPwa);

      if ((window as any).__pwaInstallPrompt) {
        setDeferredPrompt((window as any).__pwaInstallPrompt);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePromptReady = () => {
      if ((window as any).__pwaInstallPrompt) {
        setDeferredPrompt((window as any).__pwaInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent =
      deferredPrompt || (typeof window !== "undefined" ? (window as any).__pwaInstallPrompt : null);
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
        return;
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    }
    // Fallback to guide modal if native prompt is not available
    setShowGuide(true);
  };

  // If already installed in standalone window, don't clutter the header
  if (isStandalone) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:inline-flex gap-1.5 h-9 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary font-bold shadow-xs transition-all"
        onClick={handleInstallClick}
        tooltip={t("installAppTooltip", "Install App as Desktop / Mobile Application")}
        aria-label={t("installApp", "Install App")}
      >
        <Download className="size-4" />
        <span className="hidden lg:inline">{t("installApp", "Install App")}</span>
      </Button>

      {/* Mobile / Tablet Compact Icon */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden flex size-9 text-primary hover:bg-primary/10"
        onClick={handleInstallClick}
        tooltip={t("installApp", "Install App")}
        aria-label={t("installApp", "Install App")}
      >
        <Download className="size-5" />
      </Button>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Download className="size-5" /> {t("installApp", "Install App")} {appName} POS
            </DialogTitle>
            <DialogDescription>
              {t(
                "installAppDesc",
                "Install this app on your device for lightning-fast offline billing, dedicated desktop window, and hardware printer integration.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-xl border border-border/80 p-3 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Monitor className="size-4 text-primary" /> Chrome / Edge (Desktop)
              </div>
              <p className="text-muted-foreground">
                {t("installDesktopHint", "Click the Install icon (⊕) on the right side of your browser address bar, or click Menu (⋮) → Install app.")}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 p-3 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Smartphone className="size-4 text-primary" /> Android / iOS (Mobile & Tablet)
              </div>
              <p className="text-muted-foreground">
                {t("installMobileHint", "In Safari on iOS: Tap Share (⎋) → Add to Home Screen. In Chrome on Android: Tap Menu (⋮) → Install app / Add to Home screen.")}
              </p>
            </div>

            <div className="flex items-center gap-2 text-success font-semibold pt-1">
              <CheckCircle className="size-4" /> {t("worksOfflineSync", "Works offline & syncs automatically when reconnected!")}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
