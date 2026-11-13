"use client";
import React, { useMemo, useEffect } from "react";
import clsx from "clsx";
import { TemporalConsole, useReactor } from "sia-reactor/adapters/react";
import "sia-reactor/styles/temporal-console.css";
import { getBallotTemporal } from "@/context/app-store";
import { formatKeyTooltip, keyEventAllowed, parseForARIAKS } from "sia-reactor/utils";
import { KEY_SETTINGS, KEY_SHORTCUTS } from "../common/KeyHandler";
import { Election, Position, Candidate } from "@/lib/types";
import CandidateCard from "@/components/common/CandidateCard";
import Button from "@/components/common/Button";
import Chip from "@/components/common/Chip";
import BallotSteps from "./BallotSteps";
import ThumbprintIcon from "@icons/common/thumbprint-icon.svg";
import InfoIcon from "@icons/common/info.svg";
import UndoIcon from "@icons/common/undo.svg";
import RedoIcon from "@icons/common/redo.svg";
import { formatFullDateTime } from "@/lib/date";
import "@/styles/ballot/choose.css";

export interface BallotChooseProps {
  election: Election;
  positions: Position[];
  candidates: Candidate[];
  selections: Record<string, string>;
  onSelectCandidate: (positionId: string, candidateId: string) => void;
  onReview: () => void;
  targetPositionId?: string | null;
}

export const BallotChoose: React.FC<BallotChooseProps> = ({ election, positions, candidates, selections, onSelectCandidate, onReview, targetPositionId }) => {
  const temporal = getBallotTemporal(election.id);
  useReactor(temporal.state);

  const candidatesByPosition = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    candidates.forEach((c) => {
      if (!map[c.positionId]) map[c.positionId] = [];
      map[c.positionId].push(c);
    });
    return map;
  }, [candidates]);
  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [candidates]);
  const missingPosition = positions.find((p) => !selections[p.id]);
  const allChosen = positions.length > 0 && !missingPosition;
  const chosenCount = positions.filter((p) => Boolean(selections[p.id])).length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent, a = keyEventAllowed(e, KEY_SETTINGS)) => (a === "undo" || a === "redo") && (e.stopImmediatePropagation(), temporal[a]());
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [temporal]);
  useEffect(() => {
    targetPositionId && setTimeout(() => document.getElementById(`position-${targetPositionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [targetPositionId]);

  return (
    <div className="ballot-choose-container w-full flex flex-col">
      <div className="ballot-header flex flex-col w-full gap-4">
        <BallotSteps currentStep={1} />
        <h1 className="ballot-title">{election.title || "Your ballot"}</h1>
        <p className="ballot-subtitle">Pick one candidate for each office. You can change your picks until you cast your vote.</p>
      </div>
      <div className="ballot-choose-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-start w-full gap-12">
        <div className="ballot-positions-list flex flex-col w-full min-w-0 gap-9">
          {positions.map((pos) => {
            const posCandidates = candidatesByPosition[pos.id] || [];
            const selectedCandidateId = selections[pos.id];
            const isChosen = Boolean(selectedCandidateId);

            return (
              <section key={pos.id} id={`position-${pos.id}`} className={clsx("ballot-position-section flex flex-col w-full gap-3", targetPositionId === pos.id && "targeted")}>
                <div className="ballot-position-header flex items-center justify-between w-full">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="ballot-position-title">{pos.title}</h2>
                    <p className="ballot-position-meta">
                      Pick one of {posCandidates.length} {posCandidates.length === 1 ? "candidate" : "candidates"}
                    </p>
                  </div>
                  <Chip text={isChosen ? "Chosen" : "Not chosen yet"} tone={isChosen ? "ok" : "neutral"} />
                </div>
                <div className="ballot-candidates-list flex flex-col w-full gap-3">
                  {posCandidates.map((c) => (
                    <CandidateCard key={c.id} candidate={c} selected={selectedCandidateId === c.id} onSelect={() => onSelectCandidate(pos.id, c.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <aside className="ballot-sidebar-card hidden lg:flex flex-col sticky shrink-0 gap-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="ballot-picks-title">Your picks</h2>
            <div className="flex items-center gap-1">
              <button type="button" onClick={temporal.undo} disabled={!temporal.canUndo} title={`Undo${formatKeyTooltip(KEY_SHORTCUTS.undo)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.undo)} className="ballot-sidebar-history-btn rounded-md disabled:opacity-40">
                <UndoIcon className="w-4 h-4" />
              </button>
              <button type="button" onClick={temporal.redo} disabled={!temporal.canRedo} title={`Redo${formatKeyTooltip(KEY_SHORTCUTS.redo)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.redo)} className="ballot-sidebar-history-btn rounded-md disabled:opacity-40">
                <RedoIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="ballot-picks-list flex flex-col w-full gap-3">
            {positions.map((pos) => {
              const selectedId = selections[pos.id];
              const candidate = selectedId ? candidateMap.get(selectedId) : null;

              return (
                <div key={pos.id} className="ballot-pick-row flex items-center w-full gap-3">
                  <div className={clsx("ballot-pick-mark shrink-0 flex items-center justify-center", candidate ? "chosen" : "empty")}>
                    {candidate && (
                      <span className="flex items-center justify-center rotate-[12deg]">
                        <ThumbprintIcon className="w-5 h-5" />
                      </span>
                    )}
                  </div>
                  <div className="ballot-pick-info flex-1 flex flex-col min-w-0 gap-0.5">
                    <span className="ballot-pick-office truncate">{pos.title}</span>
                    <span className={clsx("ballot-pick-name font-semibold truncate", !candidate && "empty")}>{candidate ? candidate.fullName : "Not chosen yet"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="stamp" disabled={!allChosen} onClick={onReview} className="w-full">
            Review ballot
          </Button>
          <p className="ballot-sidebar-hint">{missingPosition ? `Choose a ${missingPosition.title} to continue.` : "Ready to review your ballot."}</p>
          {election.endDate && (
            <div className="ballot-sidebar-info flex items-center pt-1 gap-2">
              <InfoIcon className="ballot-sidebar-icon shrink-0" />
              <span className="whitespace-nowrap">Voting closes {formatFullDateTime(election.endDate)}</span>
            </div>
          )}
        </aside>
      </div>
      <div className="ballot-mobile-bar lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3">
        <div className="flex-1 flex flex-col min-w-0">
          <span className="ballot-mobile-summary font-semibold truncate">
            {chosenCount} of {positions.length} offices chosen
          </span>
          <span className="ballot-mobile-status truncate">{missingPosition ? `Pick a ${missingPosition.title}` : "All offices chosen"}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={temporal.undo} disabled={!temporal.canUndo} title={`Undo${formatKeyTooltip(KEY_SHORTCUTS.undo)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.undo)} className="ballot-sidebar-history-btn rounded-md disabled:opacity-40">
            <UndoIcon className="w-4 h-4" />
          </button>
          <button type="button" onClick={temporal.redo} disabled={!temporal.canRedo} title={`Redo${formatKeyTooltip(KEY_SHORTCUTS.redo)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.redo)} className="ballot-sidebar-history-btn rounded-md disabled:opacity-40">
            <RedoIcon className="w-4 h-4" />
          </button>
          <Button variant="stamp" disabled={!allChosen} onClick={onReview} className="ballot-mobile-btn shrink-0">
            Review
          </Button>
        </div>
      </div>
      {process.env.NODE_ENV !== "production" && <TemporalConsole module={temporal} title="Ballot Tape" color="var(--gold)" />}
    </div>
  );
};

export default BallotChoose;
