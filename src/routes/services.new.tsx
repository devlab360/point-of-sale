import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ServiceForm } from "@/components/services/ServiceForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServiceItemFn } from "@/api/services";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/services/new")({
  component: NewServicePage,
});

function NewServicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await createServiceItemFn({
        data: {
          id: uuidv4(),
          ...payload,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.success("Service created successfully");
        navigate({ to: "/services" });
      } else {
        toast.error("Failed to create service");
      }
    },
    onError: () => toast.error("Failed to create service"),
  });

  return (
    <div>
      <ServiceForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}
