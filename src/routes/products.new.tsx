import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/products/ProductForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductFn } from "@/api/products";
import { saveBundleComponentsFn } from "@/api/bundles";
import { saveProductModifiersFn } from "@/api/modifiers";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await createProductFn({
        data: {
          product: {
            id: uuidv4(),
            ...payload,
          },
        },
      });
    },
    onSuccess: async (res, payload) => {
      if (res?.success) {
        if (payload.isBundle && payload.bundleComponents && payload.bundleComponents.length > 0) {
          await saveBundleComponentsFn({
            data: {
              bundleProductId: res.data.id,
              components: payload.bundleComponents
            }
          });
        }
        if (payload.hasModifiers && payload.modifiers && payload.modifiers.length > 0) {
          await saveProductModifiersFn({
            data: {
              productId: res.data.id,
              modifiers: payload.modifiers
            }
          });
        }
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product created successfully");
        navigate({ to: "/products" });
      } else {
        toast.error(res?.error || "Failed to create product");
      }
    },
    onError: () => toast.error("Failed to create product"),
  });

  return (
    <div className="container mx-auto">
      <ProductForm 
        onSubmit={(data) => createMutation.mutate(data)} 
        isSaving={createMutation.isPending} 
      />
    </div>
  );
}
