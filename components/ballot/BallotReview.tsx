"use client";
import React, { useMemo } from "react";
import clsx from "clsx";
import { Election, Position, Candidate } from "@/lib/types";
import Button from "@/components/common/Button";
import { confirm } from "@t007/dialog";
import BallotSteps from "./BallotSteps";
import ThumbprintIcon from "@icons/common/thumbprint-icon.svg";
import LockIcon from "@icons/common/lock.svg";
import { getDepartmentName } from "@/lib/utils";
import "@/styles/ballot/review.css";

export interface BallotReviewProps {
  election?: Election;
  positions: Position[];
  candidates: Candidate[];
  selections: Record<string, string>;
  onBack: () => void;
  onSubmit: () => void;
  onChangePosition: (positionId: string) => void;
  submitting?: boolean;
  error?: string | null;
}

export const BallotReview: React.FC<BallotReviewProps> = ({ positions, candidates, selections, onBack, onSubmit, onChangePosition, submitting = false, error = null }) => {
  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [candidates]);
  const handleConfirmSubmit = async () => {
    if (await confirm("Cast your ballot? Once submitted, your vote is final and cannot be changed.", { confirmText: "Yes, cast my vote", cancelText: "Review selections" })) onSubmit();
  };

  return (
    <div className="ballot-review-container flex flex-col items-center w-full mx-auto">
      <div className="ballot-review-header flex flex-col w-full gap-4">
        <BallotSteps currentStep={2} />
        <h1 className="ballot-review-title">Check your ballot</h1>
        <p className="ballot-review-subtitle">These are the candidates you picked. Once you cast your vote, it can&apos;t be changed.</p>
      </div>
      <div className="ballot-review-card flex flex-col w-full">
        {positions.map((pos, index) => {
          const selectedId = selections[pos.id];
          const candidate = selectedId ? candidateMap.get(selectedId) : null;
          const subtitle = candidate ? [candidate?.departmentId ? getDepartmentName(candidate.departmentId) : "", candidate.level ? `${candidate.level} Level` : ""].filter(Boolean).join(", ") : "";

          return (
            <div key={pos.id} className={clsx("ballot-review-row flex items-center w-full gap-4", index !== positions.length - 1 && "border-b border-border-default")}>
              <div className="ballot-review-mark shrink-0 flex items-center justify-center">
                <span className="flex items-center justify-center rotate-[12deg]">
                  <ThumbprintIcon className="ballot-review-stamp-icon" />
                </span>
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="ballot-review-office font-semibold truncate">{pos.title}</span>
                <span className="ballot-review-candidate truncate">{candidate ? candidate.fullName : "Abstain"}</span>
                {subtitle && <span className="ballot-review-meta truncate">{subtitle}</span>}
              </div>
              <button type="button" onClick={() => onChangePosition(pos.id)} disabled={submitting} className="ballot-review-change-btn font-semibold hover:underline whitespace-nowrap disabled:opacity-50">
                Change
              </button>
            </div>
          );
        })}
      </div>
      <div className="ballot-secrecy-note flex items-start w-full gap-3">
        <LockIcon className="ballot-secrecy-icon shrink-0 mt-0.5" />
        <p className="ballot-secrecy-text">Your ballot is secret. We record that you voted, not who you voted for.</p>
      </div>
      {error && <div className="ballot-review-error w-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">{error}</div>}
      <div className="ballot-review-actions flex items-center w-full gap-3">
        <Button variant="secondary" onClick={onBack} disabled={submitting} className="ballot-review-back-btn shrink-0">
          Back to ballot
        </Button>
        <Button variant="stamp" onClick={handleConfirmSubmit} disabled={submitting} className="flex-1">
          {submitting ? "Casting vote..." : "Cast my vote"}
        </Button>
      </div>
    </div>
  );
};

export default BallotReview;
