import { forwardRef } from "react";
import Image from "next/image";
import type { Election, Position, Candidate } from "@/lib/types";

type TallyCandidate = Candidate & { voteCount: number };

interface ResultsPosterProps {
  election: Election;
  positions: Position[];
  candidates: TallyCandidate[];
  voterCount: number;
  positionVoterCounts: Record<string, number>;
}

export const ResultsPoster = forwardRef<HTMLDivElement, ResultsPosterProps>(
  ({ election, positions, candidates, voterCount, positionVoterCounts }, ref) => {
    const grouped = positions.map((pos) => {
      const cands = candidates
        .filter((c) => c.positionId === pos.id)
        .sort((a, b) => b.voteCount - a.voteCount);
      const totalForPos = cands.reduce((sum, c) => sum + c.voteCount, 0);
      return { position: pos, candidates: cands, totalForPos };
    });

    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    };

    return (
      <div
        ref={ref}
        className="w-full bg-white font-sans text-charcoal flex flex-col justify-start relative border border-border print:border-none print:w-full print:color-adjust-exact"
        style={{
          backgroundColor: "#fff",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Header Block */}
        <div className="w-full bg-charcoal text-white flex flex-col items-center justify-center p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-gold" />
            <h2 className="text-gold font-sans text-xs uppercase tracking-[0.2em] font-bold">
              Babcock Votes
            </h2>
            <div className="h-0.5 w-8 bg-gold" />
          </div>
          <h1 className="font-serif text-4xl text-center font-bold tracking-tight mb-2 leading-tight">
            {election.title}
          </h1>
          <p className="text-[#cccccc] font-sans tracking-widest uppercase text-sm font-semibold">
            Official Results
          </p>

          <div className="mt-6 flex gap-8 items-center text-sm font-medium text-[#aaaaaa]">
            <div className="flex flex-col items-center">
              <span className="text-white text-2xl font-bold font-serif">
                {voterCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gold mt-1">
                Unique Voters
              </span>
            </div>
          </div>
        </div>

        {/* Content Block */}
        <div className="w-full bg-white p-8 flex flex-col gap-6 print:pb-24">
          {grouped.map(({ position, candidates: cands, totalForPos }) => {
            if (cands.length === 0) return null;

            // We only prominently showcase the winner and maybe runner up if space allows
            // For now, let's list all candidates securely, highlighting the winner.
            const winner = cands[0];
            const others = cands.slice(1);

            const eligibleVoters = positionVoterCounts[position.id] || 0;
            const denominator = cands.length > 1 ? totalForPos : eligibleVoters;
            const winnerPct =
              denominator > 0
                ? ((winner.voteCount / denominator) * 100).toFixed(2)
                : 0;

            return (
              <div
                key={position.id}
                className="w-full border-l-4 border-l-gold bg-[#fcfcfc] p-5 border border-r-0 border-y-0 border-border break-inside-avoid print:shadow-none"
              >
                <h3 className="font-sans text-xs uppercase tracking-widest text-muted-gray font-bold mb-3">
                  {position.title}
                </h3>

                {/* Winner Card */}
                {winner && (
                  <div className="flex items-center gap-5 mb-3">
                    <div className="relative size-16 shrink-0 overflow-hidden bg-[#f0f0f0] rounded-full border-2 border-gold flex items-center justify-center">
                      {winner.photoUrl ? (
                        <Image
                          src={winner.photoUrl}
                          alt={winner.fullName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="font-sans text-2xl font-bold text-muted-gray">
                          {getInitials(winner.fullName)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="bg-gold text-white font-sans text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-sm">
                          Elected
                        </span>
                        <h4 className="font-serif text-xl font-bold text-charcoal">
                          {winner.fullName}
                        </h4>
                      </div>
                      <div className="font-sans mt-0.5 text-xs text-muted-gray font-medium">
                        {winner.voteCount} Votes
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-3xl font-bold text-charcoal">
                        {winnerPct}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Others row */}
                {others.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[9px] uppercase font-bold text-muted-gray tracking-wider mb-2">
                      Runners-up
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {others.map((c) => {
                        const pct =
                          denominator > 0
                            ? ((c.voteCount / denominator) * 100).toFixed(2)
                            : 0;
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 font-sans text-xs text-[#333333]"
                          >
                            <span className="font-serif font-semibold text-sm">
                              {c.fullName}
                            </span>
                            <span className="text-muted-gray">
                              &mdash; {c.voteCount} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {/* <div className="w-full bg-white p-6 border-t border-border flex justify-between items-center text-[10px] uppercase tracking-widest font-sans font-medium text-muted-gray print:fixed print:bottom-0 print:border-t-0 print:pt-4">
          <p>Generated by Babcock Votes</p>
          <p>
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div> */}
      </div>
    );
  },
);

ResultsPoster.displayName = "ResultsPoster";
