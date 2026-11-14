"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ResponsiveContainer, CartesianGrid, Bar, BarChart, Line, LineChart, XAxis, YAxis, Tooltip } from "recharts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PAGES } from "@/lib/constants";
import type { ElectionAnalyticsSummary } from "@/lib/election-analytics-types";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import AdminSkeleton from "@/components/common/skeleton/AdminSkeleton";
import "@/styles/admin/election-analytics.css";

interface CustomTooltipProps<T = Record<string, unknown>> {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number | string;
    payload: T;
  }>;
}

const numberFmt = new Intl.NumberFormat("en-US");
const pct = (value: number) => `${value.toFixed(2)}%`;

export const AdminElectionAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const analytics = useQuery(api.analytics.get, { electionId: id });

  const loading = analytics === undefined;
  const summary = (analytics ?? null) as ElectionAnalyticsSummary | null;

  const sortedPositions = useMemo(() => (summary ? [...summary.results.positions].sort((a, b) => a.title.localeCompare(b.title)) : []), [summary]);

  if (loading) return <AdminSkeleton />;

  return (
    <div className="admin-analytics-page flex flex-col w-full flex-1 gap-6 md:gap-8 mx-auto">
      <div className="admin-analytics-header flex flex-col gap-2">
        <Link href={PAGES.admin.electionResults(id)} className="admin-analytics-back inline-flex items-center no-underline gap-1.5">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Results
        </Link>
        <h1 className="admin-analytics-title font-normal">Election Analytics</h1>
      </div>
      {!summary ? (
        <div className="admin-analytics-empty-card flex flex-col gap-3">
          <h2 className="admin-analytics-empty-title font-normal">No summary yet</h2>
          <p className="admin-analytics-empty-text">Analytics summary has not been generated for this election yet. It will appear here once the summary script runs.</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium">Run:</span>
            <span className="admin-analytics-code-badge">npm run generate-analytics -- {id}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip text={`Schema v${summary.schemaVersion}`} tone="neutral" />
            <Chip text={`Generated ${new Date(summary.generatedAt).toLocaleString()}`} tone="ink" />
          </div>
          <div className="admin-analytics-stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-5">
            <div className="admin-analytics-stat-card flex flex-col gap-1.5">
              <span className="admin-analytics-stat-label font-semibold uppercase">Eligible voters</span>
              <span className="admin-analytics-stat-val font-bold">{numberFmt.format(summary.turnout.eligibleVoters)}</span>
            </div>
            <div className="admin-analytics-stat-card flex flex-col gap-1.5">
              <span className="admin-analytics-stat-label font-semibold uppercase">Unique voters</span>
              <span className="admin-analytics-stat-val font-bold">{numberFmt.format(summary.turnout.uniqueVoters)}</span>
            </div>
            <div className="admin-analytics-stat-card flex flex-col gap-1.5">
              <span className="admin-analytics-stat-label font-semibold uppercase">Turnout rate</span>
              <span className="admin-analytics-stat-val font-bold">{pct(summary.turnout.turnoutRate)}</span>
            </div>
            <div className="admin-analytics-stat-card flex flex-col gap-1.5">
              <span className="admin-analytics-stat-label font-semibold uppercase">Ballot records</span>
              <span className="admin-analytics-stat-val font-bold">{numberFmt.format(summary.integrity.ballotRecords)}</span>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="admin-analytics-card flex flex-col gap-5">
              <h2 className="admin-analytics-card-title font-semibold">Participation by level</h2>
              <div className="admin-analytics-chart-wrap w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byLevel} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
                    <XAxis dataKey="level" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }: CustomTooltipProps<{ level: string }>) =>
                        active && payload && payload.length ? (
                          <div className="admin-tooltip flex flex-col gap-1">
                            <span className="admin-tooltip-label font-semibold">{payload[0].payload.level}</span>
                            <span className="admin-tooltip-val">{numberFmt.format(payload[0].value as number)} voters</span>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="uniqueVoters" fill="#b8962e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="admin-analytics-card flex flex-col gap-5">
              <h2 className="admin-analytics-card-title font-semibold">Voting timeline</h2>
              <div className="admin-analytics-chart-wrap w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.timeline.cumulative} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }: CustomTooltipProps<{ label: string; cumulativeVotes: number; votes: number }>) =>
                        active && payload && payload.length ? (
                          <div className="admin-tooltip flex flex-col gap-1">
                            <span className="admin-tooltip-label font-semibold">{payload[0].payload.label}</span>
                            <span className="admin-tooltip-val">Cumulative: {numberFmt.format(payload[0].payload.cumulativeVotes)}</span>
                            <span className="admin-tooltip-val">Interval: {numberFmt.format(payload[0].payload.votes)}</span>
                          </div>
                        ) : null
                      }
                    />
                    <Line type="monotone" dataKey="votes" stroke="#b8962e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cumulativeVotes" stroke="var(--text-primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="admin-analytics-card flex flex-col gap-5">
            <h2 className="admin-analytics-card-title font-semibold">Winners Board</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.results.winnersBoard.map((item) => (
                <div key={item.positionId} className="admin-winner-card flex flex-col gap-1">
                  <span className="admin-winner-pos font-semibold uppercase">{item.positionTitle}</span>
                  <span className="admin-winner-name font-semibold">{item.winnerName}</span>
                  <span className="admin-winner-sub">
                    {numberFmt.format(item.winnerVotes)} votes ({pct(item.winnerPercentage)})
                  </span>
                </div>
              ))}
              {summary.results.positions
                .filter((pos) => pos.belowMinimum)
                .map((pos) => (
                  <div key={pos.positionId} className="admin-winner-card flex flex-col border-dashed gap-1">
                    <span className="admin-winner-pos font-semibold uppercase">{pos.title}</span>
                    <span className="admin-winner-name font-semibold">No winner</span>
                    <span className="admin-winner-sub">The unopposed candidate did not reach the minimum of {summary.election.minWinnerPercentage}%.</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="admin-analytics-card flex flex-col gap-5">
              <h2 className="admin-analytics-card-title font-semibold">Closest Race</h2>
              <div className="text-sm">
                {summary.results.competitiveness.closestRace ? (
                  <p>
                    {summary.results.competitiveness.closestRace.positionTitle}: {summary.results.competitiveness.closestRace.voteDifference} votes ({pct(summary.results.competitiveness.closestRace.percentagePointDifference)})
                  </p>
                ) : (
                  <p className="text-muted-gray">Not enough data.</p>
                )}
              </div>
            </div>
            <div className="admin-analytics-card flex flex-col gap-5">
              <h2 className="admin-analytics-card-title font-semibold">Most Decisive Race</h2>
              <div className="text-sm">
                {summary.results.competitiveness.mostDecisiveRace ? (
                  <p>
                    {summary.results.competitiveness.mostDecisiveRace.positionTitle}: {summary.results.competitiveness.mostDecisiveRace.voteDifference} votes ({pct(summary.results.competitiveness.mostDecisiveRace.percentagePointDifference)})
                  </p>
                ) : (
                  <p className="text-muted-gray">Not enough data.</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Per-position distribution</h2>
            {sortedPositions.map((position) => (
              <div key={position.positionId} className="admin-analytics-card flex flex-col gap-5">
                <h3 className="admin-analytics-card-title font-semibold">{position.title}</h3>
                <div className="admin-analytics-chart-wrap w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={position.candidates} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border-default)" />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }: CustomTooltipProps<{ name: string }>) =>
                          active && payload && payload.length ? (
                            <div className="admin-tooltip flex flex-col gap-1">
                              <span className="admin-tooltip-label font-semibold">{payload[0].payload.name}</span>
                              <span className="admin-tooltip-val">{numberFmt.format(payload[0].value as number)} votes</span>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="votes" fill="#b8962e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
          <div className="admin-analytics-card flex flex-col gap-5">
            <h2 className="admin-analytics-card-title font-semibold">Integrity</h2>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                Ballot records: <span className="font-semibold">{numberFmt.format(summary.integrity.ballotRecords)}</span>
              </p>
              <p>
                Inferred unique voters: <span className="font-semibold">{numberFmt.format(summary.integrity.inferredUniqueVoters)}</span>
              </p>
              <p>
                Duplicate vote records detected: <span className="font-semibold">{summary.integrity.duplicateBallotsDetected ? "Yes" : "No"}</span>
              </p>
            </div>
          </div>
        </>
      )}
      <Footer className="admin-footer" />
    </div>
  );
};

export default AdminElectionAnalytics;
