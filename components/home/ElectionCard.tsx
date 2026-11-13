"use client";
import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import type { Election } from "@/lib/types";
import CalendarIcon from "@icons/common/calendar.svg";
import { HighlightText } from "@t007/utils/components/react";
import { rippleHandler } from "@t007/utils/hooks/vanilla";
import "@/styles/home/ElectionCard.css";

const formatCardDate = (millis: number) => {
  const date = new Date(millis);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

export interface ElectionCardProps {
  election: Election;
  query?: string;
}

export const ElectionCard: React.FC<ElectionCardProps> = ({ election, query }) => {
  const { userProfile } = useAuth();
  const hasVoted = useQuery(api.votes.hasVoted, { electionId: election.id });

  const isActive = election.status === "active";
  const isUpcoming = election.status === "upcoming";
  const isSameDept = Boolean(userProfile?.departmentId && election.departmentId && userProfile.departmentId.toLowerCase().trim() === election.departmentId.toLowerCase().trim());
  const href = election.status === "closed" ? PAGES.main.results(election.id) : hasVoted ? PAGES.main.confirmation(election.id) : isActive && isSameDept ? PAGES.main.vote(election.id) : PAGES.main.preview(election.id);

  return (
    <Link href={href} data-arrow-item onPointerDown={(e) => rippleHandler(e, { target: e.currentTarget })} className={clsx("election-card no-underline relative overflow-hidden flex flex-col justify-between gap-2.5 hover:-translate-y-px", isActive ? (hasVoted ? "voted" : "open") : isUpcoming ? "upcoming" : "closed")}>
      <div className="flex items-center justify-between w-full">
        <span className={clsx(isActive ? (hasVoted ? "chip tone-ink" : "chip tone-ok") : "chip tone-neutral", "font-semibold")}>
          {isActive ? (hasVoted ? "You voted" : "Voting open") : isUpcoming ? `Opens ${formatCardDate(election.startDate)}` : "Closed"}
        </span>
        <span className="election-card-dates flex items-center shrink-0 gap-1.5">
          <span className="election-card-dates-icon flex items-center justify-center shrink-0" aria-hidden="true">
            <CalendarIcon className="w-full h-full" />
          </span>
          <span>{isActive ? `Closes ${formatCardDate(election.endDate)}` : isUpcoming ? `${formatCardDate(election.startDate)} to ${formatCardDate(election.endDate)}` : `Ended ${formatCardDate(election.endDate)}`}</span>
        </span>
      </div>
      <div className="flex flex-col w-full">
        <h3 className="election-card-title">
          <HighlightText query={query}>{election.title}</HighlightText>
        </h3>
        <span className="election-card-meta">
          <HighlightText query={query}>{getDepartmentName(election.departmentId)}</HighlightText>, {`${election.candidateCount} ${election.candidateCount === 1 ? "candidate" : "candidates"}`}
        </span>
      </div>
      <span className="election-card-action font-semibold flex items-center">
        {isActive ? (hasVoted ? "View your receipt" : isSameDept ? "Vote now" : "View candidates") : isUpcoming ? "View candidates" : "View results"}
      </span>
    </Link>
  );
};

export default ElectionCard;
