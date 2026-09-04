import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface CountryFlagProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  countryCode?: string; // ISO 2-letter code e.g. "US", "GB", "IN", "AE", "SA", "CA", "AU"
  emoji?: string; // Fallback emoji string
  className?: string;
  alt?: string;
}

/**
 * Universal Country Flag component that works consistently on Windows, macOS, Linux, iOS & Android.
 * (Windows OS does not bundle flag emoji glyphs in its system fonts, rendering letters or boxes).
 * This component displays sharp, lightweight SVG/PNG flag graphics with graceful offline fallback.
 */
export function CountryFlag({
  countryCode,
  emoji,
  className = "w-5 h-3.5",
  alt,
  ...props
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const code = (countryCode || "").toLowerCase().trim();

  if (!code || hasError) {
    return (
      <span className={cn("inline-flex items-center justify-center text-xs select-none", className)}>
        {emoji || "🌐"}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={alt || `${countryCode?.toUpperCase()} flag`}
      className={cn(
        "inline-block object-cover rounded-[2px] shrink-0 border border-black/10 dark:border-white/10 shadow-2xs aspect-[4/3]",
        className,
      )}
      loading="lazy"
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
