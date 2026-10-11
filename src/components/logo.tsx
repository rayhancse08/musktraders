import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const src = variant === "light" ? "/images/logo/logo.svg" : "/images/logo/logo-dark.svg";

  return (
    <div className={cn("relative h-11 w-[200px]")}>
      <Image
        src={src}
        fill
        alt="Musk Traders Inventory Solution logo"
        role="presentation"
        quality={100}
        className="object-contain object-left"
      />
    </div>
  );
}
