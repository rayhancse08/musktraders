import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const src = variant === "light" ? "/images/logo/logo.svg" : "/images/logo/logo-dark.svg";

  return (
    <div className={cn("relative", variant === "light" ? "h-9 w-48" : "h-9 w-44")}>
      <Image
        src={src}
        fill
        alt="Nextera Inventory Solution logo"
        role="presentation"
        quality={100}
        className="object-contain object-left"
      />
    </div>
  );
}
