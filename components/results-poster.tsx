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
  (
    { election, positions, candidates, voterCount, positionVoterCounts },
    ref,
  ) => {
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

    const parseDate = (
      dateValue:
        | { toDate?: () => Date; seconds?: number }
        | Date
        | string
        | number
        | null
        | undefined,
    ) => {
      if (!dateValue) return null;
      try {
        const val = dateValue as { toDate?: () => Date; seconds?: number };
        const date =
          typeof val.toDate === "function"
            ? val.toDate()
            : new Date(
                val.seconds
                  ? val.seconds * 1000
                  : (dateValue as string | number | Date),
              );
        return date;
      } catch (_) {
        return null;
      }
    };

    const formatDuration = (
      startVal: Parameters<typeof parseDate>[0],
      endVal: Parameters<typeof parseDate>[0],
    ) => {
      const start = parseDate(startVal);
      const end = parseDate(endVal);
      if (!start && !end) return "TBD";

      const dateOpts: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      const timeOpts: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
      };

      if (!start && end) {
        return `Until ${end.toLocaleDateString("en-US", dateOpts)}, ${end.toLocaleTimeString("en-US", timeOpts).toLowerCase()}`;
      }
      if (start && !end) {
        return `From ${start.toLocaleDateString("en-US", dateOpts)}, ${start.toLocaleTimeString("en-US", timeOpts).toLowerCase()}`;
      }

      // Both start and end exist
      const startDateStr = start!.toLocaleDateString("en-US", dateOpts);
      const endDateStr = end!.toLocaleDateString("en-US", dateOpts);
      const startTimeStr = start!
        .toLocaleTimeString("en-US", timeOpts)
        .toLowerCase();
      const endTimeStr = end!
        .toLocaleTimeString("en-US", timeOpts)
        .toLowerCase();

      if (startDateStr === endDateStr) {
        return `${startDateStr}, ${startTimeStr} - ${endTimeStr}`;
      }
      return `${startDateStr}, ${startTimeStr} \u2014 ${endDateStr}, ${endTimeStr}`;
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
        <div className="w-full bg-charcoal text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {election.logoUrl && (
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={election.logoUrl}
                alt="Background Logo"
                className="w-full h-full object-cover blur-sm scale-110"
              />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center w-full">
            {election.logoUrl && (
              <div className="relative flex items-center justify-center mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={election.logoUrl}
                  alt="Association Logo"
                  className="h-20 w-auto max-w-[240px] object-contain rounded-xl"
                />
              </div>
            )}
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

            <div className="mt-6 flex flex-wrap justify-center gap-8 items-center text-sm font-medium text-[#aaaaaa]">
              <div className="flex flex-col items-center">
                <span className="text-white text-2xl font-bold font-serif">
                  {voterCount}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gold mt-1">
                  Unique Voters
                </span>
              </div>

              {(election.startDate || election.endDate) && (
                <>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="flex flex-col items-center">
                    <span className="text-white text-lg font-bold font-sans text-center">
                      {formatDuration(election.startDate, election.endDate)}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-gold mt-1">
                      Duration
                    </span>
                  </div>
                </>
              )}
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

            const eligibleVoters = positionVoterCounts?.[position.id] || 0;
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
                        <>
                          <div className="print:hidden absolute inset-0">
                            <Image
                              src={winner.photoUrl}
                              alt={winner.fullName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={winner.photoUrl}
                            alt={winner.fullName}
                            className="hidden print:block absolute inset-0 size-full object-cover"
                            loading="lazy"
                          />
                        </>
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
        <div className="w-full bg-white p-6 border-t border-border flex flex-col gap-3 font-sans text-muted-gray print:break-inside-avoid print:border-t-0 print:pt-4">
          <p className="text-[9px] leading-relaxed">
            * <strong>Percentage Calculation Methodology:</strong> For contested
            positions (multiple candidates), percentages are calculated based on
            the total valid votes cast specifically for that position. For
            unopposed positions (single candidate), percentages reflect the
            number of votes received relative to the total number of ballots
            submitted by eligible voters for that position.
          </p>
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-medium border-t border-border/50 pt-3">
            <p>Generated by Babcock Votes</p>
            <p>
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

ResultsPoster.displayName = "ResultsPoster";
