"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { StatusBadge } from "@/components/status-badge";
import { CandidateCard } from "@/components/candidate-card";
import {
  CandidateCardSkeleton,
  SkeletonLoader,
} from "@/components/skeleton-loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import Image from "next/image";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";

const formatDateRange = (start: number, end: number) => {
  const startStr = formatShortDate(start);
  const endStr = formatShortDate(end);

  if (startStr === endStr) {
    return startStr;
  }

  return `${startStr} - ${endStr}`;
};

const CandidatesPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const data = useQuery(api.elections.detail, { id });
  const loading = data === undefined;
  const election: Election | null = data?.election ?? null;
  const positions: Position[] = data?.positions ?? [];
  const candidates: Candidate[] = data?.candidates ?? [];
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(
    null,
  );

  if (loading) {
    return (
      <div className="-mx-4 -mt-6">
        <div className="bg-linear-to-b from-charcoal to-charcoal/90 px-4 pb-6 pt-4">
          <div className="mx-auto max-w-5xl">
            <div className="mt-8 flex flex-col gap-3">
              <SkeletonLoader className="h-8 w-3/4 opacity-20" />
              <div className="flex gap-4">
                <SkeletonLoader className="h-4 w-1/4 opacity-20" />
                <SkeletonLoader className="h-4 w-1/5 opacity-20" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="mx-auto max-w-5xl">
            <SkeletonLoader className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-2 gap-3">
              <CandidateCardSkeleton />
              <CandidateCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center text-sm text-muted-gray font-sans">
        Election not found.
      </p>
    );
  }

  const grouped = positions.map((pos) => ({
    position: pos,
    candidates: candidates.filter((c) => c.positionId === pos.id),
  }));

  return (
    <div className="-mx-4 -mt-6">
      {/* Dark header */}
      <div className="bg-linear-to-b from-charcoal to-charcoal/90 px-6 pb-6 pt-4 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="mt-4">
            <StatusBadge status={election.status} />
          </div>

          <h1 className="mt-3 font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
            {election.title}
          </h1>

          <div className="mt-2 flex items-center gap-4 text-xs md:text-sm text-white/60 font-sans">
            <span className="flex items-center gap-2 font-medium">
              <Calendar className="size-3.5 md:size-4 lg:size-5" />
              {formatDateRange(election.startDate, election.endDate)}
            </span>
            <span className="flex items-center gap-2 font-medium">
              <Users className="size-3.5 md:size-4 lg:size-5" />
              {election.candidateCount} cand
              {election.candidateCount === 1 ? "idate" : "idates"}
            </span>
          </div>

          {election.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-white/50 font-sans">
              {election.description}
            </p>
          )}
        </div>
      </div>

      {/* Candidates by position */}
      <div className="px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-xl md:text-2xl lg:text-3xl font-semibold text-gold-ink">
            The Candidates
          </h2>

          <div className="mt-6 space-y-8 pb-6">
            {grouped.map(({ position, candidates: cands }) => (
              <section
                key={position.id}
                className="font-sans relative rounded-sm border border-border bg-card shadow-sm"
              >
                <div className="sticky top-0 z-10 rounded-t-sm border-b border-border/50 bg-card/95 px-4 py-3 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-lg md:text-xl font-bold text-foreground">
                      {position.title}
                    </h3>
                    {position.allowedLevels &&
                      position.allowedLevels.length > 0 && (
                        <span className="shrink-0 rounded-sm bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                          {position.allowedLevels.join(", ")}L Only
                        </span>
                      )}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cands.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => c.manifesto && setViewingCandidate(c)}
                      className={c.manifesto ? "cursor-pointer" : ""}
                    >
                      <CandidateCard candidate={c} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {election.status === "active" && (
            <div className="mt-8">
              {userProfile?.departmentId === election.departmentId ? (
                <Link
                  href={PAGES.main.vote(id)}
                  className="block w-full rounded-sm bg-gold py-3.5 text-center text-sm font-semibold text-white font-sans transition-opacity hover:opacity-90"
                >
                  Vote Now
                </Link>
              ) : (
                <div className="rounded-sm border border-border bg-secondary p-4 text-center text-sm text-muted-gray font-sans">
                  You can only vote in your own department&apos;s elections.
                </div>
              )}
            </div>
          )}

          {election.status === "closed" && (
            <div className="rounded-sm border border-border bg-secondary p-4 text-center text-sm text-muted-gray font-sans mt-8">
              This election has closed. You can no longer vote.
            </div>
          )}
        </div>
      </div>

      {/* Manifesto Viewer Dialog */}
      <Dialog
        open={!!viewingCandidate}
        onOpenChange={(open) => {
          if (!open) setViewingCandidate(null);
        }}
      >
        {viewingCandidate && (
          <DialogContent className="max-h-[85dvh] overflow-y-auto font-sans p-6">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {viewingCandidate.fullName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                  {viewingCandidate.photoUrl ? (
                    <Image
                      src={viewingCandidate.photoUrl}
                      alt={viewingCandidate.fullName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-xl font-bold text-muted-gray">
                      {viewingCandidate.fullName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-gray">
                    {getDepartmentName(viewingCandidate.departmentId)} &middot;{" "}
                    {viewingCandidate.level}L
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gold-ink">
                  Manifesto
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {viewingCandidate.manifesto}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <DialogClose
                render={
                  <button className="rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                    Close
                  </button>
                }
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default CandidatesPage;
