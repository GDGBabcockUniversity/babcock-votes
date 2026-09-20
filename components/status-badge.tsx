import { cn } from "@/lib/utils";
import type { Election } from "@/lib/types";

// Every variant carries a border so the three states are identical in size and
// shape; only the colour changes. `active` is the loudest because an open
// ballot is the thing a voter is looking for.
const variants: Record<Election["status"], string> = {
  active: "border-transparent bg-foreground text-background",
  upcoming: "border-gold/50 bg-transparent text-gold-ink",
  closed: "border-border bg-transparent text-muted-gray",
};

export const StatusBadge = ({ status }: { status: Election["status"] }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider",
      variants[status],
    )}
  >
    {/* Live elections also pulse, so the state reads without relying on colour. */}
    {status === "active" && (
      <span className="relative flex size-1.5" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
    )}
    {status}
  </span>
);
