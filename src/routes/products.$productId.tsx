import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ProductForm } from "@/components/products/ProductForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateProductFn, getProductsFn, getProductVariantsFn } from "@/api/products";
import { getBundleComponentsFn, saveBundleComponentsFn } from "@/api/bundles";
import { getProductModifiersFn, saveProductModifiersFn } from "@/api/modifiers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/products/$productId")({
  component: EditProductPage,
});

function EditProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams({ from: "/products/$productId" });
  const queryClient = useQueryClient();

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch product data. Note: We use getProductsFn here since there isn't a single getProductById in the current setup.
  // In a real app we'd have a getProductFn, but we can filter from the list or fetch directly if the endpoint supports it.
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await getProductsFn({ data: { page: 1, pageSize: 1000, query: "" } });
        if (res?.success && res.data) {
          const product = res.data.find((p: any) => p.id === productId);
          if (product) {
             // If has variants, fetch them
             if (product.hasVariants) {
                const varRes = await getProductVariantsFn({ data: { productId } });
                if (varRes?.success) {
                   product.variants = varRes.data;
                }
             }
             if (product.isBundle) {
                const bundleRes = await getBundleComponentsFn({ data: { productId } });
                if (bundleRes?.success) {
                   product.bundleComponents = bundleRes.data;
                }
             }
             if (product.hasModifiers) {
                const modRes = await getProductModifiersFn({ data: { productId } });
                if (modRes?.success) {
                   product.modifiers = modRes.data;
                }
             }
             setInitialData(product);
          } else {
             toast.error("Product not found");
             navigate({ to: "/products" });
          }
        }
      } catch (e: any) {
        console.error("Product load error:", e);
        toast.error("Failed to load product: " + (e?.message || "Unknown error"));
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
        const updateItem = (item: any) => item.id === productId ? { ...item, ...updatedProduct } : item;
        
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
      toast.error("Failed to update product");
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
              components: payload.bundleComponents || []
            }
          });
        }
        if (payload.hasModifiers && payload.modifiers && payload.modifiers.length > 0) {
          await saveProductModifiersFn({
            data: {
              productId: productId,
              modifiers: payload.modifiers
            }
          });
        }
        // onSettled handles invalidation
        toast.success("Product updated successfully");
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
    <div className="container mx-auto">
      <ProductForm 
        initialData={initialData}
        onSubmit={(data) => updateMutation.mutate(data)} 
        isSaving={updateMutation.isPending} 
      />
    </div>
  );
}
