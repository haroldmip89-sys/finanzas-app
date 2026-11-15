import Image from "next/image";

import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Classes for the name, e.g. to hide it in the narrow rail. */
  nameClassName?: string;
  className?: string;
  size?: number;
};

/** App icon plus name. */
export function BrandLogo({ nameClassName, className, size = 34 }: BrandLogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/yupi-logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[10px]"
      />
      <span className={cn("text-[19px] font-extrabold tracking-[-0.02em]", nameClassName)}>
        {SITE_NAME}!
      </span>
    </span>
  );
}
