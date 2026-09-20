import Link from "next/link";
import Image from "next/image";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { Election } from "@/lib/types";
import { PAGES } from "@/lib/constants";
import { toDate } from "@/lib/date";

const formatDate = (value: number) =>
  toDate(value)?.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  }) ?? "";

export const ElectionCard = ({ election }: { election: Election }) => {
  const isActive = election.status === "active";

  return (
    <Link
      href={PAGES.main.electionDetail(election.id)}
      className="group block h-full rounded-sm"
    >
      <div
        className={cn(
          // h-full keeps cards in a row the same height whatever the title length.
          "flex h-full flex-col rounded-sm border p-5 group-hover:shadow-md",
          isActive
            ? "border-gold/30 bg-gold-tint"
            : "border-border bg-card group-hover:border-gold/30",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <StatusBadge status={election.status} />
          {election.logoUrl && (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
              <Image
                src={election.logoUrl}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* mt-auto on the meta row pins it to the bottom, so the rows line up
            across cards even when titles wrap to different heights. */}
        <h3 className="my-4 font-serif text-lg font-bold text-balance md:text-xl lg:text-2xl">
          {election.title}
        </h3>

        <div className="mt-auto flex items-center gap-3 font-sans text-xs font-medium text-muted-gray md:text-sm">
          <span className="flex items-center gap-2">
            <Calendar className="size-3.5 md:size-4" />
            {formatDate(election.startDate)}
          </span>
          <span aria-hidden="true" className="text-muted-gray/40">
            &#8226;
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-3.5 md:size-4" />
            {election.candidateCount}{" "}
            {election.candidateCount === 1 ? "candidate" : "candidates"}
          </span>
        </div>
      </div>
    </Link>
  );
};
