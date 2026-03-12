import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { Election } from "@/lib/types";

const formatDate = (ts: { seconds: number }) =>
  new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });

export const ElectionCard = ({ election }: { election: Election }) => {
  const isActive = election.status === "active";

  return (
    <Link href={`/elections/${election.id}`}>
      <div
        className={cn(
          "rounded-xl border p-5 transition-shadow hover:shadow-md",
          isActive ? "border-gold/30 bg-gold-tint" : "border-border bg-white",
        )}
      >
        <StatusBadge status={election.status} />

        <h3 className="mt-3 font-serif text-lg italic">{election.title}</h3>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-gray">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatDate(election.startDate)}
          </span>
          <span className="text-muted-gray/40">&#8226;</span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {election.candidateCount} Cands.
          </span>
        </div>
      </div>
    </Link>
  );
};
