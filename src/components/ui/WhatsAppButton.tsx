import React from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  href: string;
  variant?: "primary" | "secondary" | "outline" | "compact";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function WhatsAppButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children = "Order on WhatsApp",
}: WhatsAppButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-sans uppercase font-semibold tracking-wider transition-all duration-300 active:scale-[0.98] rounded-none select-none";

  const sizeStyles = {
    sm: "text-xs px-4 py-2 gap-1.5",
    md: "text-xs md:text-sm px-6 py-3.5 gap-2.5",
    lg: "text-sm md:text-base px-8 py-4 gap-3",
  };

  const variantStyles = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/30",
    secondary: "bg-vantaire-champagne hover:bg-vantaire-goldHover text-vantaire-black shadow-md border border-vantaire-champagne/40",
    outline: "bg-transparent border border-emerald-500/70 text-emerald-400 hover:bg-emerald-950/30 hover:border-emerald-400",
    compact: "bg-emerald-600/90 hover:bg-emerald-500 text-white px-3 py-2 text-xs gap-1.5",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      <MessageCircle className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      <span>{children}</span>
    </a>
  );
}
