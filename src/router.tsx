import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  let router: any;

  // Global error handler for API responses
  const handleApiError = (data: any, error?: Error) => {
    // If it's a structural error thrown by the fetcher
    if (error) {
      console.error("Query Error:", error);
      return;
    }

    // If it's our standard API payload indicating failure
    if (data && typeof data === "object" && data.success === false) {
      const code = data.code;
      // We only want to hard-redirect for critical status codes
      if (code === 403 || code === 401 || code === 404 || code >= 500) {
        if (router) {
          router.navigate({
            to: "/error",
            search: { code, message: data.error || data.message },
          });
        }
      }
    }
  };

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      // In v5, onSuccess/onError are removed from useQuery but still exist on QueryCache!
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
        refetchOnWindowFocus: false,
      },
    },
  });

  const actualRouter = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  router = actualRouter;
  return actualRouter;
};
