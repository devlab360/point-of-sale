import { useLanguage } from "@/contexts/LanguageContext";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ServiceForm } from "@/components/services/ServiceForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateServiceItemFn, getServicesListFn, getServiceVariantsFn } from "@/api/services";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/services/$serviceId")({
  component: EditServicePage,
});

function EditServicePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { serviceId } = useParams({ from: "/services/$serviceId" });
  const queryClient = useQueryClient();

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await getServicesListFn({ data: { page: 1, pageSize: 1000, query: "" } });
        if (res?.success && res.data) {
          const service = res.data.find((s: any) => s.id === serviceId);
          if (service) {
            if (service.hasVariants) {
              const varRes = await getServiceVariantsFn({ data: serviceId });
              if (varRes?.success) {
                service.variants = varRes.data;
              }
            }
            setInitialData(service);
          } else {
            toast.error(t("serviceNotFound", "Service not found"));
            navigate({ to: "/services" });
          }
        }
      } catch (e) {
        toast.error(t("failedToLoadService", "Failed to load service"));
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [serviceId, navigate]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await updateServiceItemFn({
        data: {
          ...payload,
          id: serviceId,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.success(t("serviceUpdatedSuccess", "Service updated successfully"));
        navigate({ to: "/services" });
      } else {
        toast.error(t("failedToUpdateService", "Failed to update service"));
      }
    },
    onError: () => toast.error("Failed to update service"),
  });

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <div>
      <ServiceForm
        initialData={initialData}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
