import React, { useState, useRef } from "react";
import { UploadCloud, X, RefreshCw, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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

  const urls: string[] = Array.isArray(value) ? value : value ? [value] : [];

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
    setProgress(10);

    try {
      const uploadPromises = targetFiles.map((file) =>
        uploadToVercelBlob(file, {
          folder,
          allowedTypes,
          maxSizeMB,
          onProgress: (p) => setProgress(p),
        })
      );

      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.url);

      if (multiple) {
        onChange([...urls, ...newUrls]);
      } else {
        onChange(newUrls[0]);
      }

      toast.success(
        results.length === 1
          ? `File '${results[0].name}' uploaded via Vercel Blob!`
          : `${results.length} files uploaded via Vercel Blob!`
      );
    } catch (err: any) {
      console.error("[FileUpload Error]:", err);
      const msg = err.message || "Failed to upload file to Vercel Blob.";
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
    toast.info("File removed");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && <label className="block text-xs font-semibold text-foreground">{label}</label>}

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer select-none",
          isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
          disabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-muted/20",
          uploadError && "border-destructive/60 bg-destructive/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || isUploading}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2 w-full max-w-xs">
            <Loader2 className="size-8 text-primary animate-spin" />
            <span className="text-xs font-semibold text-foreground">Uploading to Vercel Blob...</span>
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
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary mb-1">
              <UploadCloud className="size-5" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Click or drag file to upload (Vercel Blob)
            </span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </div>
        )}
      </div>

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

      {/* Previews / Selected Files Grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {urls.map((url, idx) => {
            const isImage = url.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
            return (
              <div
                key={idx}
                className="group relative flex items-center justify-center rounded-xl border border-border bg-card p-2 shadow-sm overflow-hidden h-24"
              >
                {isImage ? (
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(url);
                    }}
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
