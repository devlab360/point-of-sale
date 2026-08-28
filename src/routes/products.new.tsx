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
      const product = {
        id: uuidv4(),
        ...payload,
      };
      return await createProductFn({
        data: { product },
      });
    },
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });

      const previousProducts = queryClient.getQueryData(["products"]);

      const optimisticProduct = {
        id: uuidv4(),
        ...newProduct,
        stock: newProduct.stock || 0,
        createdAt: new Date().toISOString(),
      };

      // Optimistically update all queries matching ["products"]
      queryClient.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old) return old;
        if (old.data) {
          return { ...old, data: [optimisticProduct, ...old.data] };
        }
        if (Array.isArray(old)) {
          return [optimisticProduct, ...old];
        }
        return old;
      });

      return { previousProducts };
    },
    onError: (err, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      toast.error("Failed to create product");
    },
    onSettled: () => {
      // Background re-fetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
    },
    onSuccess: async (res, payload) => {
      if (res?.success) {
        if (payload.isBundle && payload.bundleComponents && payload.bundleComponents.length > 0) {
          await saveBundleComponentsFn({
            data: {
              bundleProductId: res.data.id,
              components: payload.bundleComponents,
            },
          });
        }
        if (payload.hasModifiers && payload.modifiers && payload.modifiers.length > 0) {
          await saveProductModifiersFn({
            data: {
              productId: res.data.id,
              modifiers: payload.modifiers,
            },
          });
        }
        // No need to invalidate here as onSettled handles it
        toast.success("Product created successfully");
        navigate({ to: "/products" });
      } else {
        toast.error(res?.error || "Failed to create product");
      }
    },
  });

  return (
    <div>
      <ProductForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}
