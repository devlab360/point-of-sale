import { useLanguage } from "@/contexts/LanguageContext";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ProductForm } from "@/components/products/ProductForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductByIdFn, updateProductFn } from "@/api/products";
import { saveBundleComponentsFn } from "@/api/bundles";
import { saveProductModifiersFn } from "@/api/modifiers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/products/$productId")({
  component: EditProductPage,
});

function EditProductPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { productId } = useParams({ from: "/products/$productId" });
  const queryClient = useQueryClient();

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await getProductByIdFn({ data: { id: productId } });
        if (res && res.success && res.data) {
          setInitialData(res.data);
        } else {
          toast.error(t("productNotFound", "Product not found"));
          navigate({ to: "/products" });
        }
      } catch (e) {
        toast.error(t("failedToLoadProductDetails", "Failed to load product details"));
        navigate({ to: "/products" });
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigate]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await updateProductFn({
        data: {
          id: productId,
          updates: payload,
        },
      });
    },
    onMutate: async (updatedProduct) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });

      const previousProducts = queryClient.getQueryData(["products"]);

      // Optimistically update all queries matching ["products"]
      queryClient.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old) return old;
        const updateItem = (item: any) =>
          item.id === productId ? { ...item, ...updatedProduct } : item;

        if (old.data) {
          return { ...old, data: old.data.map(updateItem) };
        }
        if (Array.isArray(old)) {
          return old.map(updateItem);
        }
        return old;
      });

      return { previousProducts };
    },
    onError: (err, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      toast.error(t("failedToUpdateProduct", "Failed to update product"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
    },
    onSuccess: async (res, payload) => {
      if (res?.success) {
        if (payload.isBundle) {
          await saveBundleComponentsFn({
            data: {
              bundleProductId: productId,
              components: payload.bundleComponents || [],
            },
          });
        }
        if (payload.hasModifiers && payload.modifiers && payload.modifiers.length > 0) {
          await saveProductModifiersFn({
            data: {
              productId: productId,
              modifiers: payload.modifiers,
            },
          });
        }
        // onSettled handles invalidation
        toast.success(t("productUpdatedSuccess", "Product updated successfully"));
        navigate({ to: "/products" });
      } else {
        toast.error(res?.error || "Failed to update product");
      }
    },
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
      <ProductForm
        initialData={initialData}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
