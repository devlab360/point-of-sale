import React, { useState, useRef } from "react";
import { UploadCloud, X, RefreshCw, FileText, CheckCircle2, AlertCircle, Loader2, ImageIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadToVercelBlob, validateFileBeforeUpload } from "@/lib/upload-service";

export interface FileUploadProps {
  value?: string | string[];
  onChange: (value: any) => void;
  folder?: string;
  accept?: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  folder = "uploads",
  accept = "image/*",
  allowedTypes,
  maxSizeMB = 5,
  multiple = false,
  disabled = false,
  label = "Upload File",
  description = `Drag & drop or click to upload (Max ${maxSizeMB}MB)`,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const urls: string[] = Array.isArray(value) ? value : value ? [value] : [];

  // For single-image mode: the currently selected image
  const singleUrl = !multiple && urls.length > 0 ? urls[0] : null;
  const isSingleImage = singleUrl
    ? singleUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(singleUrl)
    : false;

  /** Simulate smooth upload progress that slows down as it approaches the cap. */
  const startSimulatedProgress = () => {
    setProgress(8);
    const MAX = 92; // never reach 100% until actually done
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= MAX) return prev;
        // Increment shrinks as progress grows — mimics real network behaviour
        const remaining = MAX - prev;
        const step = Math.max(0.4, remaining * 0.07 + Math.random() * 1.5);
        return Math.min(MAX, parseFloat((prev + step).toFixed(1)));
      });
    }, 250);
  };

  const stopSimulatedProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled || files.length === 0) return;
    setUploadError(null);

    const filesArray = Array.from(files);
    const targetFiles = multiple ? filesArray : [filesArray[0]];

    for (const file of targetFiles) {
      const validation = validateFileBeforeUpload(file, { allowedTypes, maxSizeMB });
      if (!validation.valid) {
        setUploadError(validation.error || "File validation failed.");
        toast.error(validation.error);
        return;
      }
    }

    setIsUploading(true);
    startSimulatedProgress();

    try {
      const uploadPromises = targetFiles.map((file) =>
        uploadToVercelBlob(file, { folder, allowedTypes, maxSizeMB })
      );

      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.url);

      // Snap to 100% on success
      stopSimulatedProgress();
      setProgress(100);

      if (multiple) {
        onChange([...urls, ...newUrls]);
      } else {
        onChange(newUrls[0]);
      }

      toast.success(
        results.length === 1
          ? `Image '${results[0].name}' uploaded!`
          : `${results.length} images uploaded!`
      );
    } catch (err: any) {
      stopSimulatedProgress();
      console.error("[FileUpload Error]:", err);
      const msg = err.message || "Failed to upload file.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (urlToRemove: string) => {
    if (disabled) return;
    if (multiple) {
      onChange(urls.filter((u) => u !== urlToRemove));
    } else {
      onChange("");
    }
    toast.info("Image removed");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && <label className="block text-xs font-semibold text-foreground">{label}</label>}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || isUploading}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* ── Single-image preview inside the zone ── */}
      {!multiple && isSingleImage && singleUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group relative overflow-hidden rounded-xl border-2 border-dashed transition-all",
            isDragging ? "border-primary scale-[1.01]" : "border-border/60 hover:border-primary/60",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          style={{ aspectRatio: "16/7" }}
        >
          {/* Preview image fills the zone */}
          <img
            src={singleUrl}
            alt="Product preview"
            className="size-full object-cover"
          />

          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
              <Loader2 className="size-8 text-primary animate-spin" />
              <span className="text-xs font-semibold text-foreground">Uploading...</span>
              <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{progress}%</span>
            </div>
          )}

          {/* Hover overlay with actions */}
          {!isUploading && (
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 px-3 text-xs font-semibold shadow-lg"
                onClick={() => !disabled && fileInputRef.current?.click()}
              >
                <ImageIcon className="size-3.5 mr-1.5" />
                Change
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 px-3 text-xs font-semibold shadow-lg"
                onClick={(e) => { e.stopPropagation(); handleRemove(singleUrl); }}
              >
                <X className="size-3.5 mr-1.5" />
                Remove
              </Button>
            </div>
          )}

          {/* Success badge */}
          {!isUploading && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-success/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <CheckCircle2 className="size-3" />
              Saved
            </div>
          )}
        </div>
      ) : (
        /* ── Empty / uploading drop zone ── */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none",
            isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
            disabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-muted/20",
            uploadError && "border-destructive/60 bg-destructive/5"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2 w-full max-w-xs">
              <Loader2 className="size-8 text-primary animate-spin" />
              <span className="text-xs font-semibold text-foreground">Uploading image...</span>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-1">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{progress}%</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary mb-1">
                <UploadCloud className="size-5" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Click or drag image here
              </span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          )}
        </div>
      )}

      {/* Error bar */}
      {uploadError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{uploadError}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <RefreshCw className="size-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Multiple-file preview grid (only for multiple mode) */}
      {multiple && urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {urls.map((url, idx) => {
            const isImg = url.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
            return (
              <div
                key={idx}
                className="group relative flex items-center justify-center rounded-xl border border-border bg-card p-2 shadow-sm overflow-hidden h-24"
              >
                {isImg ? (
                  <img src={url} alt={`Upload ${idx + 1}`} className="size-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <FileText className="size-6 text-primary" />
                    <span className="text-[10px] font-mono truncate max-w-[100px]">Document</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="size-7"
                    title="Remove file"
                    onClick={(e) => { e.stopPropagation(); handleRemove(url); }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="absolute top-1 right-1 bg-success text-success-foreground p-0.5 rounded-full shadow-xs">
                  <CheckCircle2 className="size-3 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
