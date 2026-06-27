import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { backgroundSync } from "@/lib/sync";
import { toast } from "sonner";

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const pendingSalesCount = useLiveQuery(
    () => localDb.offlineSales.where("synced").equals("false").count(),
    []
  ) || 0;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error("You are offline. Cannot sync right now.");
      return;
    }
    
    setIsSyncing(true);
    try {
      await backgroundSync();
      toast.success("Sync completed");
    } catch (e) {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingSalesCount === 0 && isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20">
        <Cloud className="size-3.5" />
        Online
      </div>
    );
  }

  return (
    <button 
      onClick={handleManualSync}
      disabled={isSyncing || (!isOnline && pendingSalesCount === 0)}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
        !isOnline 
          ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" 
          : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20"
      )}
    >
      {!isOnline ? (
        <CloudOff className="size-3.5" />
      ) : (
        <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
      )}
      {!isOnline ? "Offline" : "Syncing"}
      {pendingSalesCount > 0 && (
        <span className="ml-1 inline-flex h-4 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-bold">
          {pendingSalesCount} pending
        </span>
      )}
    </button>
  );
}
