import { useState } from "react";

const DEFAULT_LOGO = import.meta.env.VITE_LOGO_URL;

/**
 * A company's logo (Companies.LogoUrl, returned by login). Falls back to the default
 * CashGear logo when there is none or the image fails to load.
 */
export function CompanyLogo({ url, alt, className }: { url?: string | null; alt?: string | null; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = url && url !== failedUrl ? url : DEFAULT_LOGO;

  return (
    <img
      src={src}
      alt={alt || "CashGear"}
      className={className}
      onError={() => {
        if (url && src === url) setFailedUrl(url);
      }}
    />
  );
}
