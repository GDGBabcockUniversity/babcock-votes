import Link from "next/link";
import Image from "next/image";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { Election } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const formatDate = (ts: { seconds: number }) =>
  new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });

export const ElectionCard = ({ election }: { election: Election }) => {
  const isActive = election.status === "active";

  return (
    <Link href={PAGES.main.electionDetail(election.id)}>
      <div
        className={cn(
          "border p-5 transition-shadow hover:shadow-md",
          isActive ? "border-gold/30 bg-gold-tint" : "border-border bg-white",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <StatusBadge status={election.status} />
          {election.logoUrl && (
            <div className="relative size-10 shrink-0 overflow-hidden bg-muted border border-border">
              <Image
                src={election.logoUrl}
                alt={`${election.title} logo`}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        <h3 className="my-4 font-serif text-lg md:text-xl lg:text-2xl font-bold">
          {election.title}
        </h3>

        <div className="flex items-center gap-3 text-xs md:text-sm text-muted-gray font-sans">
          <span className="flex items-center gap-2 font-medium">
            <Calendar className="size-3.5 md:size-4 lg:size-5" />
            {formatDate(election.startDate)}
          </span>
          <span className="text-muted-gray/40">&#8226;</span>
          <span className="flex items-center gap-2 font-medium">
            <Users className="size-3.5 md:size-4 lg:size-5" />
            {election.candidateCount} cand
            {election.candidateCount === 1 ? "idate" : "idates"}
          </span>
        </div>
      </div>
    </Link>
  );
};
