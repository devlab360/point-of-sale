import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SessionStore } from "@/lib/session-store";
import { toast } from "sonner";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const getRouter = () => {
  let router: any;

  // Global error handler for API responses and background network failures
  const handleApiError = (data: any, error?: any) => {
    if (error) {
      console.error("[Query/Mutation Error]", error);
      reportLovableError(error instanceof Error ? error : new Error(String(error)), {
        boundary: "tanstack_query_cache",
      });

      // Handle 401 Unauthorized
      if (error?.status === 401 || error?.statusCode === 401 || String(error?.message).includes("401")) {
        SessionStore.removeAuthUser();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          toast.error("Your session has expired. Please log in again.");
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
      }

      // Handle 403 Forbidden
      if (error?.status === 403 || error?.statusCode === 403 || String(error?.message).includes("403")) {
        toast.error("Access denied. You do not have permission to perform this action.");
        return;
      }

      // Transient network failure notice
      if (
        String(error?.message).toLowerCase().includes("failed to fetch") ||
        String(error?.message).toLowerCase().includes("networkerror")
      ) {
        toast.error("Network connection issue. Please check your internet connection.");
        return;
      }

      return;
    }

    // If it's a structured API payload indicating failure
    if (data && typeof data === "object" && data.success === false) {
      const code = data.code;
      if (code === 401) {
        SessionStore.removeAuthUser();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          toast.error("Session expired. Please log in again.");
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
      }
      if (code === 403) {
        toast.error(data.error || "Permission denied for this operation.");
        return;
      }
    }
  };

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (data) => handleApiError(data),
      onError: (error) => handleApiError(null, error),
    }),
    mutationCache: new MutationCache({
      onSuccess: (data) => handleApiError(data),
      onError: (error) => handleApiError(null, error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error: any) => {
          // Do not retry 4xx client errors (400, 401, 403, 404, 422)
          const status = error?.status || error?.statusCode;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
      mutations: {
        retry: false,
      },
    },
  });

  const actualRouter = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 5 * 60 * 1000,
  });

  router = actualRouter;
  return actualRouter;
};
