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

        <h3 className="my-4 font-serif text-lg md:text-xl lg:text-2xl font-bold italic">{election.title}</h3>

        <div className="flex items-center gap-3 text-xs md:text-sm text-muted-gray font-sans">
          <span className="flex items-center gap-2 font-medium">
            <Calendar className="size-3.5 md:size-4 lg:size-5" />
            {formatDate(election.startDate)}
          </span>
          <span className="text-muted-gray/40">&#8226;</span>
          <span className="flex items-center gap-2 font-medium">
            <Users className="size-3.5 md:size-4 lg:size-5" />
            {election.candidateCount} cand{election.candidateCount === 1 ? "idate" : "idates"}
          </span>
        </div>
      </div>
    </Link>
  );
};
