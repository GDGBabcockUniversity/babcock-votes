"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { usePath } from "sia-reactor/adapters/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { store, setBallotSelection, setBallotStep, setBallotTargetPosition } from "@/context/app-store";
import BallotChoose from "./BallotChoose";
import BallotReview from "./BallotReview";
import { BallotSkeleton, BallotConfirmationSkeleton } from "@/components/common/skeleton";
import { PAGES } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import type { Id } from "@/convex/_generated/dataModel";
import type { Election, Candidate } from "@/lib/types";
import "@/styles/ballot/ballot.css";

export interface BallotProps {
  electionId: string;
}

export const Ballot: React.FC<BallotProps> = ({ electionId }) => {
  const router = useRouter();
  const { userProfile } = useAuth();
  const data = useQuery(api.elections.detail, { id: electionId });
  const hasVoted = useQuery(api.votes.hasVoted, { electionId });
  const castVote = useMutation(api.votes.cast);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const election: Election | null = data?.election ?? null;
  const candidates: Candidate[] = data?.candidates ?? [];
  const loading = data === undefined || hasVoted === undefined;
  const draft = usePath(store, "ballots")?.[electionId];
  const selections = draft?.selections ?? {};
  const step: 1 | 2 = draft?.step === 2 ? 2 : 1;
  const eligiblePositions = useMemo(() => {
    const list = data?.positions ?? [];
    return !userProfile ? list : list.filter((p) => !p.allowedLevels || p.allowedLevels.length === 0 || p.allowedLevels.includes(userProfile.level));
  }, [data?.positions, userProfile]);

  const handleSelectCandidate = (posId: string, candId: string) => setBallotSelection(electionId, posId, candId);
  const handleSubmitVote = async () => {
    if (!election) return;
    (setSubmitting(true), setError(null));
    try {
      await castVote({ electionId: election.id as Id<"elections">, selections: selections as Record<Id<"positions">, Id<"candidates">> });
      router.replace(PAGES.main.confirmation(electionId));
    } catch (err) {
      (setError(errorMessage(err)), setSubmitting(false));
    }
  };

  useEffect(() => {
    if (loading || !election) return;
    if (hasVoted && !submitting) return router.replace(PAGES.main.confirmation(electionId));
    if (election.status === "closed") return router.replace(PAGES.main.results(electionId));
    if (election.status === "upcoming" || (userProfile && election.departmentId && userProfile.departmentId.toLowerCase().trim() !== election.departmentId.toLowerCase().trim())) router.replace(PAGES.main.preview(electionId));
  }, [loading, election, hasVoted, submitting, userProfile, electionId, router]);

  if (loading) return <BallotSkeleton />;
  if (hasVoted && !submitting) return <BallotConfirmationSkeleton />;

  if (!election)
    return (
      <div className="ballot-page-wrapper flex flex-col items-center justify-center min-h-80 text-center w-full mx-auto">
        <h2 className="ballot-not-found-title">{`Election not found`}</h2>
        <p className="ballot-not-found-desc">{`This election may have been removed or does not exist.`}</p>
      </div>
    );

  return (
    <div className="ballot-page-wrapper w-full mx-auto">
      {step === 1 && <BallotChoose election={election} positions={eligiblePositions} candidates={candidates} selections={selections} targetPositionId={draft?.targetPositionId ?? null} onSelectCandidate={handleSelectCandidate} onReview={() => (setBallotTargetPosition(electionId, null), setBallotStep(electionId, 2))} />}
      {step === 2 && <BallotReview positions={eligiblePositions} candidates={candidates} selections={selections} submitting={submitting} error={error} onBack={() => (setBallotTargetPosition(electionId, null), setBallotStep(electionId, 1))} onChangePosition={(posId) => (setBallotTargetPosition(electionId, posId), setBallotStep(electionId, 1))} onSubmit={handleSubmitVote} />}
    </div>
  );
};

export default Ballot;
