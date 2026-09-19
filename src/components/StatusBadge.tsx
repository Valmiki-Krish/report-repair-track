import { statusBadgeClass, isStatus } from "@/lib/reports";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = isStatus(status) ? status : "Reported";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        statusBadgeClass[key],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {key}
      {key === "Verified" ? " ✓" : ""}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {category}
    </span>
  );
}
