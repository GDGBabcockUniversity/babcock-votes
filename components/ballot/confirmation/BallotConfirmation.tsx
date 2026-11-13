"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { clearBallotDraft } from "@/context/app-store";
import BallotSuccess from "../BallotSuccess";
import { BallotConfirmationSkeleton } from "@/components/common/skeleton";
import { PAGES } from "@/lib/constants";
import type { Election } from "@/lib/types";

export interface BallotConfirmationProps {
  electionId: string;
}

export const BallotConfirmation: React.FC<BallotConfirmationProps> = ({ electionId }) => {
  const router = useRouter();
  const { authUser, userProfile } = useAuth();
  const data = useQuery(api.elections.detail, { id: electionId });
  const hasVoted = useQuery(api.votes.hasVoted, { electionId });
  const receipt = useQuery(api.votes.getReceipt, { electionId });

  const election: Election | null = data?.election ?? null;
  const loading = data === undefined || hasVoted === undefined || receipt === undefined;

  useEffect(() => {
    clearBallotDraft(electionId);
    !loading && hasVoted === false && router.replace(PAGES.main.vote(electionId));
  }, [loading, hasVoted, electionId, router]);

  if (loading || !election) return <BallotConfirmationSkeleton />;

  return (
    <div className="ballot-confirmation-wrap w-full flex items-center justify-center">
      <BallotSuccess election={election} voterName={userProfile?.fullName || authUser?.email || "Voter"} votedAt={receipt?.votedAt} receiptCode={receipt?.receiptCode} />
    </div>
  );
};

export default BallotConfirmation;
