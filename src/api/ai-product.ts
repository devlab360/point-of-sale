import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { callAiChat, cleanJsonOutput } from "@/lib/ai-client";

export const extractProductFromImageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      existingCategories: z.array(z.string()).optional(),
      existingBrands: z.array(z.string()).optional(),
      existingUnits: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const systemPrompt = `You are an expert retail POS catalog specialist powered by LongCat AI. 
Analyze this product image (package, label, box, or bottle) carefully and extract all product metadata into a strict, valid JSON format.

Known store categories: ${JSON.stringify(data.existingCategories || [])}
Known store brands: ${JSON.stringify(data.existingBrands || [])}
Known store units: ${JSON.stringify(data.existingUnits || ["pcs", "kg", "g", "l", "ml", "box", "pack"])}

CRITICAL: Return ONLY raw JSON (no markdown formatting, no \`\`\`json tags, no explanations).
JSON Structure:
{
  "name": "Standard clean product name (e.g., 'Lux Velvet Touch Beauty Soap 100g')",
  "brand": "Brand name if visible, or null",
  "category": "Best matching category or reasonable guess (e.g., 'Cosmetics & Personal Care')",
  "unit": "Appropriate unit such as 'pcs', 'pack', 'kg', 'ml', 'g'",
  "cost": 0,
  "price": 0,
  "wholesalePrice": 0,
  "barcode": "Barcode numbers if legible from package or null",
  "sku": "Suggested short uppercase SKU code (e.g. LUX-SOAP-100G)",
  "reorderLevel": 10,
  "hsnCode": "Standard HSN/SAC code if applicable, or null",
  "gstRate": 0,
  "taxInclusive": true,
  "expiryDate": "YYYY-MM-DD if expiry date is visible on packaging, else null",
  "hasBatch": false,
  "batchNo": "Batch number if visible on packaging, else null",
  "notes": "Brief 1-line description of the item"
}`;

      const aiResponse = await callAiChat({
        systemPrompt,
        userMessage: "Extract product data from this image packaging label.",
        imageBase64: data.imageBase64,
        mimeType: data.mimeType,
        temperature: 0.2,
      });

      const extracted = cleanJsonOutput(aiResponse);

      return {
        success: true as const,
        data: extracted,
      };
    } catch (error: any) {
      return handleApiError(error, "Failed to analyze product image with LongCat AI: " + (error.message || "Unknown error"));
    }
  });

export const extractProductFromPromptFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      prompt: z.string(),
      existingCategories: z.array(z.string()).optional(),
      existingBrands: z.array(z.string()).optional(),
      existingUnits: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const systemPrompt = `You are a Smart POS Data Entry Assistant for NexisPOS powered by LongCat AI. 
The user is providing product information through voice transcription or rapid natural language typing in English, Bengali, or Banglish (e.g., "প্রাণ ম্যাংগো জুস ২৫০মি.লি. ৫০ পিস কেনা ৩০ বেচা ৩৫", "Lux soap 100g 20 units cost 40 sell 50 category soap", "Samsung S24 Ultra 256GB Black cost 90000 sell 110000 5 pieces").

Parse the intent, extract all specifications, numbers, prices, and intelligently infer missing values.

Known categories: ${JSON.stringify(data.existingCategories || [])}
Known brands: ${JSON.stringify(data.existingBrands || [])}
Known units: ${JSON.stringify(data.existingUnits || ["pcs", "kg", "g", "l", "ml", "box", "pack", "can"])}

Return STRICT JSON ONLY matching:
{
  "name": "Full Clean Product Name",
  "brand": "Brand Name or empty string",
  "category": "Matched or suggested Category",
  "unit": "Unit name (e.g. pcs, kg, ml)",
  "cost": 0,
  "price": 0,
  "wholesalePrice": 0,
  "dealerPrice": 0,
  "stock": 0,
  "reorderLevel": 10,
  "barcode": "Barcode if mentioned or empty string",
  "sku": "Auto-generated clean SKU (e.g. PRN-MJ-250ML)",
  "expiryDate": "YYYY-MM-DD if date mentioned or empty string",
  "hsnCode": "",
  "gstRate": 0,
  "taxInclusive": true,
  "hasVariants": false,
  "hasSerial": false,
  "hasBatch": false
}`;

      const aiResponse = await callAiChat({
        systemPrompt,
        userMessage: data.prompt,
        temperature: 0.2,
      });

      const extracted = cleanJsonOutput(aiResponse);

      return {
        success: true as const,
        data: extracted,
      };
    } catch (error: any) {
      return handleApiError(error, "Failed to parse product text with LongCat AI: " + (error.message || "Unknown error"));
    }
  });

export const lookupBarcodeDetailsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      barcode: z.string(),
    })
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      // Step 1: Attempt Open Food Facts public API lookup
      try {
        const offRes = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data.barcode)}.json`
        );
        if (offRes.ok) {
          const offJson = await offRes.json();
          if (offJson.status === 1 && offJson.product) {
            const p = offJson.product;
            return {
              success: true as const,
              data: {
                name: p.product_name || p.product_name_en || p.generic_name || "",
                brand: p.brands || "",
                category: p.categories?.split(",")?.[0]?.trim() || "",
                unit: p.quantity || "pcs",
                image: p.image_front_url || p.image_url || "",
                barcode: data.barcode,
                sku: `${(p.brands || "SKU").substring(0, 4).toUpperCase()}-${data.barcode.slice(-4)}`,
              },
            };
          }
        }
      } catch (err) {
        // Fallback to LongCat AI lookup
      }

      // Step 2: Fallback to LongCat AI knowledge base
      const systemPrompt = `Lookup standard product details for barcode "${data.barcode}".
Return STRICT JSON ONLY:
{
  "found": true or false,
  "name": "Product Name or null",
  "brand": "Brand or null",
  "category": "Category or null",
  "unit": "pcs",
  "barcode": "${data.barcode}",
  "sku": "SKU"
}`;

      const aiResponse = await callAiChat({
        systemPrompt,
        userMessage: `Identify product for barcode: ${data.barcode}`,
        temperature: 0.1,
      });

      const extracted = cleanJsonOutput(aiResponse);

      if (extracted && extracted.found && extracted.name) {
        return {
          success: true as const,
          data: extracted,
        };
      }

      return {
        success: false as const,
        error: "Product not found in global database. You can use Photo or Voice add.",
      };
    } catch (error: any) {
      return handleApiError(error, "Barcode lookup failed");
    }
  });
