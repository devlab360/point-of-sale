import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  Camera, 
  Mic, 
  MicOff, 
  ScanBarcode, 
  Wand2, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  Image as ImageIcon,
  Upload,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  extractProductFromImageFn, 
  extractProductFromPromptFn, 
  lookupBarcodeDetailsFn 
} from "@/api/ai-product";

interface AiProductMagicBarProps {
  categories?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  units?: { id: string; name: string }[];
  onApplyData: (extractedData: any) => void;
}

export function AiProductMagicBar({
  categories = [],
  brands = [],
  units = [],
  onApplyData,
}: AiProductMagicBarProps) {
  const [activeModal, setActiveModal] = useState<"none" | "image" | "voice" | "magic" | "barcode">("none");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Magic Text & Voice State
  const [magicPrompt, setMagicPrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Barcode State
  const [barcodeInput, setBarcodeInput] = useState("");

  const catNames = categories.map((c) => c.name);
  const brandNames = brands.map((b) => b.name);
  const unitNames = units.map((u) => u.name);

  // Helper to handle image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      setSelectedImage(base64String);
      await processImage(base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Full: string, mimeType: string) => {
    setIsLoading(true);
    setExtractedData(null);
    try {
      const base64Clean = base64Full.includes(",") ? base64Full.split(",")[1] : base64Full;
      const res = await extractProductFromImageFn({
        data: {
          imageBase64: base64Clean,
          mimeType: mimeType || "image/jpeg",
          existingCategories: catNames,
          existingBrands: brandNames,
          existingUnits: unitNames,
        },
      });

      if (res.success && res.data) {
        setExtractedData(res.data);
        toast.success("AI successfully extracted product data from photo!");
      } else {
        toast.error((res as any)?.error || "Could not recognize product details from image");
      }
    } catch (err: any) {
      toast.error("Image extraction failed: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Web Speech API Voice Recognition
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please use Chrome/Edge or type your prompt.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "bn-BD"; // Bengali default with fallback recognition

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceTranscript("");
      };

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        toast.error("Voice error: " + event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsRecording(false);
      toast.error("Could not start microphone: " + err.message);
    }
  };

  // Process text or voice prompt
  const handlePromptProcess = async (textToProcess: string) => {
    if (!textToProcess.trim()) {
      toast.error("Please provide product details to parse");
      return;
    }

    setIsLoading(true);
    setExtractedData(null);
    try {
      const res = await extractProductFromPromptFn({
        data: {
          prompt: textToProcess,
          existingCategories: catNames,
          existingBrands: brandNames,
          existingUnits: unitNames,
        },
      });

      if (res.success && res.data) {
        setExtractedData(res.data);
        toast.success("AI parsed product details successfully!");
      } else {
        toast.error((res as any)?.error || "AI could not parse the text");
      }
    } catch (err: any) {
      toast.error("AI parse failed: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Barcode Lookup
  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) {
      toast.error("Please enter a barcode number");
      return;
    }

    setIsLoading(true);
    setExtractedData(null);
    try {
      const res = await lookupBarcodeDetailsFn({
        data: { barcode: barcodeInput.trim() },
      });

      if (res.success && res.data) {
        setExtractedData(res.data);
        toast.success("Product found from barcode database!");
      } else {
        toast.error((res as any)?.error || "Product not found. Try Photo or Voice add.");
      }
    } catch (err: any) {
      toast.error("Barcode search error: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Apply to form
  const applyExtracted = () => {
    if (!extractedData) return;
    onApplyData(extractedData);
    toast.success("✨ Form auto-filled with AI data!");
    setActiveModal("none");
    setExtractedData(null);
    setSelectedImage(null);
    setVoiceTranscript("");
    setMagicPrompt("");
    setBarcodeInput("");
  };

  return (
    <>
      {/* 🚀 Sleek Glassmorphic AI Action Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-purple-500/10 to-blue-500/15 p-[1px] shadow-sm mb-6 border border-primary/20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/95 backdrop-blur-xl p-4 rounded-[15px]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm tracking-tight text-foreground">AI Quick Product Creator</h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Instant Auto-Fill
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Skip manual typing — add items via photo scan, voice command, 1-line text, or barcode.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal("image");
                setExtractedData(null);
              }}
              className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/10 text-xs font-medium gap-1.5 shadow-sm"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>Photo Scan</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal("voice");
                setExtractedData(null);
              }}
              className="flex-1 sm:flex-none border-purple-500/30 hover:bg-purple-500/10 text-xs font-medium gap-1.5 shadow-sm"
            >
              <Mic className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Voice / বাংলা</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal("magic");
                setExtractedData(null);
              }}
              className="flex-1 sm:flex-none border-blue-500/30 hover:bg-blue-500/10 text-xs font-medium gap-1.5 shadow-sm"
            >
              <Wand2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>1-Sentence</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal("barcode");
                setExtractedData(null);
              }}
              className="flex-1 sm:flex-none border-amber-500/30 hover:bg-amber-500/10 text-xs font-medium gap-1.5 shadow-sm"
            >
              <ScanBarcode className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Barcode Lookup</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 📸 Modal: Photo Scan */}
      <Dialog open={activeModal === "image"} onOpenChange={(open) => !open && setActiveModal("none")}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              AI Photo-to-Product Scanner
            </DialogTitle>
            <DialogDescription>
              Upload or snap a photo of any product package, bottle, or label. Gemini AI will extract all details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/30 hover:border-primary rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-muted/30 hover:bg-primary/5 transition-all text-center"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Click to upload product image</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border max-h-56 bg-black/5 flex items-center justify-center">
                <img src={selectedImage} alt="Product preview" className="max-h-56 object-contain" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Change Image
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-3 p-6 bg-primary/5 rounded-xl border border-primary/10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">Gemini Vision is analyzing product image...</span>
              </div>
            )}

            {extractedData && (
              <ExtractedPreviewCard data={extractedData} />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModal("none")}>Cancel</Button>
            {extractedData && (
              <Button onClick={applyExtracted} className="gap-2 bg-gradient-to-r from-primary to-purple-600 text-white">
                <CheckCircle2 className="h-4 w-4" />
                Apply to Product Form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🎙️ Modal: Voice / Bangla Input */}
      <Dialog open={activeModal === "voice"} onOpenChange={(open) => !open && setActiveModal("none")}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-purple-600" />
              Voice-to-Product (বাংলা বা English)
            </DialogTitle>
            <DialogDescription>
              Speak naturally. Example: &quot;প্রাণ ম্যাংগো জুস ২৫০ মি.লি. ৫০ পিস কেনা ৩০ টাকা বেচা ৩৫ টাকা&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center p-6 bg-purple-500/5 rounded-2xl border border-purple-500/20 text-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={toggleVoiceRecording}
                className={`h-16 w-16 rounded-full shadow-lg transition-all ${
                  isRecording 
                    ? "bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-500/30" 
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
              </Button>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                {isRecording ? "Listening... Speak now (বলুন)" : "Click mic to start speaking"}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Speech Transcript / Edit Text:</label>
              <Textarea
                rows={3}
                placeholder="Transcribed voice text will appear here..."
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                className="text-sm"
              />
            </div>

            {!extractedData && (
              <Button
                type="button"
                onClick={() => handlePromptProcess(voiceTranscript)}
                disabled={isLoading || !voiceTranscript.trim()}
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Extract Details with AI
              </Button>
            )}

            {extractedData && (
              <ExtractedPreviewCard data={extractedData} />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModal("none")}>Cancel</Button>
            {extractedData && (
              <Button onClick={applyExtracted} className="gap-2 bg-gradient-to-r from-purple-600 to-primary text-white">
                <CheckCircle2 className="h-4 w-4" />
                Apply to Product Form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ⚡ Modal: 1-Sentence Magic Prompt */}
      <Dialog open={activeModal === "magic"} onOpenChange={(open) => !open && setActiveModal("none")}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-blue-600" />
              1-Sentence Magic Creator
            </DialogTitle>
            <DialogDescription>
              Type a single quick sentence with whatever product info you have. AI will do the rest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product Description Prompt:</label>
              <Textarea
                rows={3}
                placeholder="e.g. Samsung S24 Ultra 256GB Black, cost 90000, sell 110000, 5 units in stock, 1 year warranty"
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-1">Quick examples:</span>
              <button
                type="button"
                onClick={() => setMagicPrompt("Lux Velvet Touch Soap 100g, 24 pcs, cost 45, sell 55, Category: Cosmetics")}
                className="text-[11px] px-2 py-0.5 bg-muted hover:bg-muted/80 rounded-md text-foreground transition-colors border border-border"
              >
                Lux Soap 100g
              </button>
              <button
                type="button"
                onClick={() => setMagicPrompt("Coca Cola 500ml Bottle, 48 pcs, buy 35, retail 40, Drinks")}
                className="text-[11px] px-2 py-0.5 bg-muted hover:bg-muted/80 rounded-md text-foreground transition-colors border border-border"
              >
                Coke 500ml
              </button>
            </div>

            {!extractedData && (
              <Button
                type="button"
                onClick={() => handlePromptProcess(magicPrompt)}
                disabled={isLoading || !magicPrompt.trim()}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Product Structure
              </Button>
            )}

            {extractedData && (
              <ExtractedPreviewCard data={extractedData} />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModal("none")}>Cancel</Button>
            {extractedData && (
              <Button onClick={applyExtracted} className="gap-2 bg-gradient-to-r from-blue-600 to-primary text-white">
                <CheckCircle2 className="h-4 w-4" />
                Apply to Product Form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔍 Modal: Barcode Lookup */}
      <Dialog open={activeModal === "barcode"} onOpenChange={(open) => !open && setActiveModal("none")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-amber-600" />
              Global Barcode Lookup
            </DialogTitle>
            <DialogDescription>
              Scan with barcode scanner or enter standard EAN/UPC code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Scan or enter barcode (e.g. 8901030381001)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeLookup()}
                autoFocus
              />
              <Button
                type="button"
                onClick={handleBarcodeLookup}
                disabled={isLoading || !barcodeInput.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
              </Button>
            </div>

            {extractedData && (
              <ExtractedPreviewCard data={extractedData} />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModal("none")}>Cancel</Button>
            {extractedData && (
              <Button onClick={applyExtracted} className="gap-2 bg-gradient-to-r from-amber-600 to-primary text-white">
                <CheckCircle2 className="h-4 w-4" />
                Apply to Product Form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExtractedPreviewCard({ data }: { data: any }) {
  return (
    <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-inner space-y-2 text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Extracted Product Summary
        </span>
        <span className="text-[10px] text-muted-foreground uppercase font-mono">Ready to populate</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-muted-foreground">Product Name:</span>
          <p className="font-medium text-foreground truncate">{data.name || "N/A"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Brand:</span>
          <p className="font-medium text-foreground truncate">{data.brand || "N/A"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Category:</span>
          <p className="font-medium text-foreground truncate">{data.category || "General"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Unit:</span>
          <p className="font-medium text-foreground truncate">{data.unit || "pcs"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Cost Price:</span>
          <p className="font-medium text-foreground">৳{data.cost || 0}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Retail Sale Price:</span>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">৳{data.price || 0}</p>
        </div>
        {data.stock !== undefined && (
          <div>
            <span className="text-muted-foreground">Initial Stock:</span>
            <p className="font-medium text-foreground">{data.stock} {data.unit || "pcs"}</p>
          </div>
        )}
        {data.sku && (
          <div>
            <span className="text-muted-foreground">SKU:</span>
            <p className="font-mono text-muted-foreground truncate">{data.sku}</p>
          </div>
        )}
      </div>
    </div>
  );
}
