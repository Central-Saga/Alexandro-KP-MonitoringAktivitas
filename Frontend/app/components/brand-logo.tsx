import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textVariant?: "sidebar" | "login" | "settings" | "minimal";
  className?: string;
}

export default function BrandLogo({
  size = "md",
  showText = true,
  textVariant = "sidebar",
  className = "",
}: BrandLogoProps) {
  const sizeConfig = {
    sm: { img: 24, box: "h-8 w-8 rounded-lg" },
    md: { img: 32, box: "h-10 w-10 rounded-xl" },
    lg: { img: 44, box: "h-12 w-12 rounded-xl" },
    xl: { img: 56, box: "h-16 w-16 rounded-2xl" },
  };

  const { img, box } = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center p-1 shadow-xs ring-1 ring-white/20 backdrop-blur-xs ${
          textVariant === "sidebar"
            ? "bg-white/10"
            : textVariant === "login"
              ? "bg-[#EAF7FB] ring-[#016273]/20 shadow-sm"
              : "bg-[#EAF7FB] ring-[#016273]/20"
        } ${box}`}
      >
        <Image
          src="/images/csm-logo.png"
          alt="Logo Central Saga Mandala"
          width={img}
          height={img}
          className="h-full w-full object-contain"
          priority
        />
      </div>

      {showText && textVariant === "sidebar" && (
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-tight tracking-tight text-white">
            WorkTrack
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a8db8c]/90">
            Monitoring System
          </p>
        </div>
      )}

      {showText && textVariant === "login" && (
        <div>
          <h1 className="text-xl font-bold leading-tight text-[#030303] sm:text-2xl">
            Central Saga Mandala
          </h1>
          <p className="text-xs font-semibold text-[#016273] sm:text-sm">
            WorkTrack — Monitoring System
          </p>
        </div>
      )}

      {showText && textVariant === "settings" && (
        <div>
          <h2 className="text-sm font-bold text-[#030303] sm:text-base">
            Informasi Aplikasi
          </h2>
          <p className="text-xs text-[#5a737e]">
            Identitas dan metadata sistem WorkTrack
          </p>
        </div>
      )}

      {showText && textVariant === "minimal" && (
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white">
            WorkTrack
          </p>
        </div>
      )}
    </div>
  );
}
