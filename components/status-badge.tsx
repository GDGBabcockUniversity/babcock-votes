import { cn } from "@/lib/utils";
import type { Election } from "@/lib/types";

const variants: Record<Election["status"], string> = {
  active: "bg-charcoal text-white",
  upcoming: "border border-gold text-gold bg-transparent",
  closed: "border border-muted-gray text-muted-gray bg-transparent",
};

export const StatusBadge = ({ status }: { status: Election["status"] }) => (
  <span
    className={cn(
      "inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      variants[status],
    )}
  >
    {status}
  </span>
);
