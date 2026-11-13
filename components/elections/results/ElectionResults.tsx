"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { exportResultsPdf } from "@/lib/results-pdf";
import { formatPercentage, resolveWinners } from "@/lib/winners";
import type { Election, Position, Candidate } from "@/lib/types";
import Button, { ButtonLink } from "@/components/common/Button";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import { ElectionResultsSkeleton } from "@/components/common/skeleton";
import toast from "@/lib/toast";
import "@/styles/elections/results.css";

export interface ElectionResultsProps {
  electionId: string;
}

export const ElectionResults: React.FC<ElectionResultsProps> = ({ electionId }) => {
  const router = useRouter();
  const detail = useQuery(api.elections.detail, { id: electionId });
  const election: Election | null = detail?.election ?? null;
  const positions: Position[] = detail?.positions ?? [];
  const tallies = useQuery(api.votes.tallies, election ? { electionId } : "skip");
  const eligibleVoterCountData = useQuery(api.eligibleVoters.countByDepartment, election ? { departmentId: election.departmentId } : "skip");

  const [exporting, setExporting] = useState(false);

  const eligibleVoterCount = eligibleVoterCountData ?? 0;
  const loading = detail === undefined || (election !== null && (tallies === undefined || eligibleVoterCountData === undefined));
  const candidates: (Candidate & { voteCount: number })[] = (detail?.candidates ?? []).map((c) => ({ ...c, voteCount: tallies?.candidateVotes[c.id] ?? 0 }));
  const positionVoterCounts: Record<string, number> = tallies?.positionVotes ?? {};
  const positionAbstainCounts: Record<string, number> = tallies?.positionAbstains ?? {};
  const voterCount = positions.length > 0 ? Math.max(0, ...positions.map((p) => positionVoterCounts[p.id] ?? 0)) : 0;

  const handleExportPdf = async () => {
    if (!election || exporting) return;
    setExporting(true);
    try {
      await exportResultsPdf({ election, positions, candidates, voterCount, eligibleVoterCount, positionVoterCounts, positionAbstainCounts });
      toast.success("Results PDF exported successfully.");
    } catch {
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    !loading && election && election.status !== "closed" && router.replace(PAGES.main.vote(electionId));
  }, [loading, election, electionId, router]);

  if (loading) return <ElectionResultsSkeleton />;

  if (!election)
    return (
      <div className="election-results-page flex flex-col items-center justify-center flex-1 w-full">
        <p className="text-sm font-medium text-text-secondary">Election not found.</p>
        <ButtonLink href={PAGES.main.elections} variant="secondary" className="mt-4">
          Back to Elections
        </ButtonLink>
      </div>
    );

  return (
    <div className="election-results-page flex flex-col flex-1 w-full gap-6 lg:gap-8 mx-auto">
      <div className="flex flex-col gap-1 w-full">
        <Link href={PAGES.main.elections} className="text-sm font-semibold text-text-secondary hover:text-text-primary no-underline flex items-center mb-2">
          Back to elections
        </Link>
        <div className="election-results-header flex items-start justify-between flex-wrap w-full gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="election-results-title font-normal">{election.title}</h1>
              <Chip text="Closed" tone="neutral" />
            </div>
            <p className="election-results-subtitle font-normal">Official Results &bull; {election ? getDepartmentName(election.departmentId) : ""}</p>
          </div>
          <Button variant="stamp" size="sm" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? "Generating PDF..." : "Export PDF"}
          </Button>
        </div>
      </div>
      <div className="election-results-stat-grid grid grid-cols-1 sm:grid-cols-3 w-full gap-4">
        <div className="election-results-stat-card flex flex-col justify-between gap-2">
          <span className="election-stat-label font-medium">Total votes cast</span>
          <span className="election-stat-value font-normal">{voterCount.toLocaleString()}</span>
        </div>
        <div className="election-results-stat-card flex flex-col justify-between gap-2">
          <span className="election-stat-label font-medium">Eligible voters</span>
          <span className="election-stat-value font-normal">{eligibleVoterCount.toLocaleString()}</span>
        </div>
        <div className="election-results-stat-card flex flex-col justify-between gap-2">
          <span className="election-stat-label font-medium">Turnout</span>
          <span className="election-stat-value font-normal">{eligibleVoterCount > 0 ? ((voterCount / eligibleVoterCount) * 100).toFixed(1) : "0.0"}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-6 w-full">
        {positions.map((pos) => {
          const posCandidates = candidates.filter((c) => c.positionId === pos.id).sort((a, b) => b.voteCount - a.voteCount);
          const totalVotersForPos = positionVoterCounts[pos.id] ?? 0;
          const abstainCount = positionAbstainCounts[pos.id] ?? 0;
          const outcome = resolveWinners(posCandidates, totalVotersForPos, election.minWinnerPercentage);

          return (
            <div key={pos.id} className="election-position-card flex flex-col w-full gap-5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border-default">
                <div className="flex flex-col">
                  <h2 className="text-xl font-serif text-text-primary">{pos.title}</h2>
                  <span className="text-xs text-text-secondary">
                    {totalVotersForPos} voters participated &bull; {abstainCount} abstained
                  </span>
                </div>
                {outcome.belowMinimum ? <Chip text="Below minimum" tone="neutral" /> : outcome.winners.length === 1 ? <Chip text={`Winner: ${outcome.winners[0].fullName}`} tone="ok" /> : outcome.winners.length > 1 ? <Chip text="Tie / Runoff" tone="ink" /> : null}
              </div>
              <div className="flex flex-col w-full">
                {posCandidates.map((cand) => {
                  const pct = totalVotersForPos > 0 ? (cand.voteCount / totalVotersForPos) * 100 : 0;

                  return (
                    <div key={cand.id} className="election-candidate-row flex flex-col w-full gap-2">
                      <div className="flex items-center justify-between w-full text-sm">
                        <span className="font-semibold text-text-primary">{cand.fullName}</span>
                        <span className="font-medium text-text-secondary">
                          {cand.voteCount} votes ({formatPercentage(pct)})
                        </span>
                      </div>
                      <div className="election-vote-bar-track w-full overflow-hidden">
                        <div className={`election-vote-bar-fill h-full ${outcome.winners.includes(cand) ? "winner" : ""}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {posCandidates.length === 0 && <p className="text-xs text-text-secondary py-3">No candidates for this position.</p>}
                <div className="election-candidate-row flex flex-col w-full mt-2 pt-2 border-t border-border-default">
                  <div className="flex items-center justify-between w-full text-sm">
                    <span className="font-medium italic text-text-secondary">Abstain</span>
                    <span className="font-medium text-text-secondary">
                      {abstainCount} ({formatPercentage(totalVotersForPos > 0 ? (abstainCount / totalVotersForPos) * 100 : 0)})
                    </span>
                  </div>
                  <div className="election-vote-bar-track w-full overflow-hidden">
                    <div className="election-vote-bar-fill h-full opacity-60" style={{ width: `${totalVotersForPos > 0 ? (abstainCount / totalVotersForPos) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer className="mt-8" />
    </div>
  );
};

export default ElectionResults;
