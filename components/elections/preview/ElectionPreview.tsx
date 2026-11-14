"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import type { Election, Candidate } from "@/lib/types";
import Button, { ButtonLink } from "@/components/common/Button";
import Chip from "@/components/common/Chip";
import CandidateCard from "@/components/common/CandidateCard";
import DialogModal from "@/components/common/DialogModal";
import Avatar from "@/components/common/Avatar";
import Footer from "@/components/common/Footer";
import { ElectionPreviewSkeleton } from "@/components/common/skeleton";
import CalendarIcon from "@icons/common/calendar.svg";
import "@/styles/elections/preview.css";

const formatCardDate = (millis: number) => {
  const date = new Date(millis);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

export interface ElectionPreviewProps {
  electionId: string;
}

export const ElectionPreview: React.FC<ElectionPreviewProps> = ({ electionId }) => {
  const { userProfile } = useAuth();
  const data = useQuery(api.elections.detail, { id: electionId });
  const hasVoted = useQuery(api.votes.hasVoted, { electionId });

  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);

  const loading = data === undefined || hasVoted === undefined;
  const election: Election | null = data?.election ?? null;
  const isSameDept = Boolean(userProfile?.departmentId && election?.departmentId && userProfile.departmentId.toLowerCase().trim() === election.departmentId.toLowerCase().trim());

  const grouped = useMemo(() => (data?.positions ?? []).map((pos) => ({ position: pos, candidates: (data?.candidates ?? []).filter((c) => c.positionId === pos.id) })), [data?.positions, data?.candidates]);

  if (loading) return <ElectionPreviewSkeleton />;

  if (!election)
    return (
      <div className="election-preview-page flex flex-col items-center justify-center flex-1 w-full">
        <p className="text-sm font-medium text-text-secondary">Election not found.</p>
        <ButtonLink href={PAGES.main.elections} variant="secondary" className="mt-4">
          Back to Elections
        </ButtonLink>
      </div>
    );

  const isActive = election.status === "active";
  const isUpcoming = election.status === "upcoming";

  return (
    <div className="election-preview-page flex flex-col flex-1 w-full gap-6 lg:gap-8 mx-auto">
      <div className="flex flex-col gap-1 w-full">
        <Link href={PAGES.main.elections} className="text-sm font-semibold text-text-secondary hover:text-text-primary no-underline flex items-center mb-2">
          Back to elections
        </Link>
        <div className="election-preview-header flex flex-col w-full gap-5">
          <div className="flex items-center justify-between flex-wrap gap-3 w-full">
            <div className="flex items-center gap-3">
              <h1 className="election-preview-title font-normal">{election.title}</h1>
              <Chip text={isActive ? (hasVoted ? "You voted" : "Voting open") : election.status === "upcoming" ? `Opens ${formatCardDate(election.startDate)}` : "Closed"} tone={isActive ? (hasVoted ? "ink" : "ok") : "neutral"} />
            </div>
            {isActive && isSameDept && !hasVoted && (
              <ButtonLink href={PAGES.main.vote(election.id)} variant="stamp">
                Vote now
              </ButtonLink>
            )}
            {isActive && hasVoted && (
              <ButtonLink href={PAGES.main.confirmation(election.id)} variant="secondary">
                View your receipt
              </ButtonLink>
            )}
            {election.status === "closed" && (
              <ButtonLink href={PAGES.main.results(election.id)} variant="secondary">
                View results
              </ButtonLink>
            )}
          </div>
          <div className="election-preview-meta flex items-center flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <span className="size-3.5 flex items-center justify-center shrink-0" aria-hidden="true">
                <CalendarIcon className="w-full h-full" />
              </span>
              <span>{isActive ? `Closes ${formatCardDate(election.endDate)}` : isUpcoming ? `${formatCardDate(election.startDate)} to ${formatCardDate(election.endDate)}` : `Ended ${formatCardDate(election.endDate)}`}</span>
            </span>
            <span>&bull;</span>
            <span>{getDepartmentName(election.departmentId)}</span>
            <span>&bull;</span>
            <span>
              {data?.candidates.length ?? 0} {data?.candidates.length === 1 ? "candidate" : "candidates"}
            </span>
          </div>
          {election.description && <p className="election-preview-desc font-normal">{election.description}</p>}
          {isActive && !isSameDept && <div className="election-preview-notice font-normal">You can only cast ballots in your own registered department ({userProfile?.departmentId ? getDepartmentName(userProfile.departmentId) : "your department"}). You can still review the candidates and their manifestos below.</div>}
          {isUpcoming && <div className="election-preview-notice font-normal">Voting has not opened yet. It will open on {formatCardDate(election.startDate)}. You can explore the candidates and manifestos below before voting begins.</div>}
        </div>
      </div>
      <div className="flex flex-col gap-8 w-full">
        {grouped.map(({ position, candidates: posCandidates }) => (
          <section key={position.id} className="election-preview-section flex flex-col w-full gap-5">
            <div className="flex items-center justify-between pb-2 border-b border-border-default">
              <h2 className="election-preview-section-title font-normal">{position.title}</h2>
              {position.allowedLevels && position.allowedLevels.length > 0 && <span className="text-xs font-semibold text-text-secondary">{position.allowedLevels.join(", ")}L Only</span>}
            </div>
            {posCandidates.length === 0 ? (
              <p className="text-xs text-text-secondary py-4">No candidates registered for this position yet.</p>
            ) : (
              <div className="election-candidates-grid grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {posCandidates.map((cand) => (
                  <div key={cand.id} onClick={() => cand.manifesto && setViewingCandidate(cand)} className={cand.manifesto ? "cursor-pointer" : ""}>
                    <CandidateCard candidate={cand} interactive={Boolean(cand.manifesto)} showStamp={false} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      <DialogModal open={Boolean(viewingCandidate)} onClose={() => setViewingCandidate(null)} width="36rem">
        {viewingCandidate && (
          <div className="manifesto-modal-body flex flex-col p-6 w-full gap-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border-default w-full">
              <Avatar src={viewingCandidate.photoUrl} name={viewingCandidate.fullName} size="xl" className="shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="font-serif text-2xl text-text-primary leading-tight truncate">{viewingCandidate.fullName}</h3>
                <span className="text-xs font-medium text-text-secondary mt-0.5">
                  {getDepartmentName(viewingCandidate.departmentId) || <i>Unknown</i>} &bull; {viewingCandidate.level || "-00"}L
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gold-ink">Manifesto</span>
              <p className="manifesto-text font-normal">{viewingCandidate.manifesto || "No manifesto provided."}</p>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-default mt-auto">
              <Button variant="secondary" size="sm" onClick={() => setViewingCandidate(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogModal>
      <Footer className="mt-8" />
    </div>
  );
};

export default ElectionPreview;
