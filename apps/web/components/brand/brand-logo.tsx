import Image from "next/image";
import mark from "@/public/brand/alfath-mark.png";

export const BRAND_NAME = "Al Fath Accounts & Tax Solutions";

/**
 * The Al Fath logo: the ribbon mark, optionally with the "Al fath" wordmark
 * (teal "Al", navy "fath", as in the logo) and the "Accounts & Tax Solutions"
 * line. The wordmark stays Latin and left-to-right on Arabic pages too.
 */
export default function BrandLogo({
  variant = "name",
  className = "",
  priority = false,
}: {
  /** mark: the ribbons only · name: + "Al fath" · full: + the descriptor line. */
  variant?: "mark" | "name" | "full";
  className?: string;
  priority?: boolean;
}) {
  const image = (
    <Image
      src={mark}
      // The text beside it already names the firm; alone, the image must.
      alt={variant === "mark" ? BRAND_NAME : ""}
      priority={priority}
      className={variant === "full" ? "h-10 w-auto" : "h-8 w-auto"}
    />
  );
  if (variant === "mark") return <span className={`inline-flex ${className}`}>{image}</span>;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} dir="ltr">
      {image}
      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-bold tracking-tight">
          <span className="text-brand-700">Al</span> <span className="text-navy-800">fath</span>
        </span>
        {variant === "full" && (
          <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Accounts &amp; Tax Solutions
          </span>
        )}
      </span>
    </span>
  );
}
