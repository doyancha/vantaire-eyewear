import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  statusBadge?: {
    text: string;
    variant?: "success" | "warning" | "neutral" | "info";
  };
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  statusBadge,
}: MetricCardProps) {
  const getBadgeStyle = (variant: string = "neutral") => {
    switch (variant) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "info":
        return "bg-vantaire-champagne/15 text-vantaire-champagne border-vantaire-champagne/30";
      default:
        return "bg-vantaire-charcoal text-vantaire-sand border-vantaire-border/60";
    }
  };

  return (
    <div className="p-5 bg-vantaire-charcoal/40 border border-vantaire-border/70 hover:border-vantaire-champagne/40 transition-colors flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] uppercase tracking-luxury text-vantaire-muted font-medium">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 bg-vantaire-black/40 border border-vantaire-border/40 text-vantaire-sand flex-shrink-0">
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-serif text-3xl font-medium text-vantaire-warmWhite tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {statusBadge && (
            <span
              className={`text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 border ${getBadgeStyle(
                statusBadge.variant
              )}`}
            >
              {statusBadge.text}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-vantaire-sand/70 mt-1.5 leading-relaxed font-sans">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
