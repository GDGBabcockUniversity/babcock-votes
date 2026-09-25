/**
 * Winner rules shared by the results page, the PDF export and the analytics
 * summary (which runs on the Convex server), so they can never disagree.
 *
 * Percentages use the same base everywhere: every ballot recorded for the
 * position, abstentions included.
 */

/** True when `votes` is enough to win. Without a minimum, any votes at all will do (plurality). */
export const meetsMinimum = (
  votes: number,
  positionBallots: number,
  minPercentage?: number | null,
) => {
  if (votes <= 0) return false;
  if (minPercentage == null) return true;
  // Cross-multiplied so there's no rounding on a value like 33.33.
  return positionBallots > 0 && votes * 100 >= minPercentage * positionBallots;
};

export interface PositionOutcome<T> {
  /** Everyone tied on the top vote count; empty when nobody qualifies. */
  winners: T[];
  /** Everyone else, in the order given. */
  others: T[];
  /** The unopposed candidate has votes but does not meet the minimum. */
  belowMinimum: boolean;
}

/** `ranked` must be sorted by votes, highest first. */
export const resolveWinners = <T extends { voteCount: number }>(
  ranked: T[],
  positionBallots: number,
  minPercentage?: number | null,
): PositionOutcome<T> => {
  const top = ranked[0]?.voteCount ?? 0;
  const leaders = top > 0 ? ranked.filter((c) => c.voteCount === top) : [];
  const qualifies = meetsMinimum(top, positionBallots, ranked.length === 1 ? minPercentage : undefined);
  const winners = qualifies ? leaders : [];
  return {
    winners,
    others: ranked.filter((c) => !winners.includes(c)),
    belowMinimum: leaders.length > 0 && !qualifies,
  };
};

export const formatPercentage = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, "")}%`;
