"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { CartesianGrid, Bar, BarChart, Line, LineChart, XAxis, YAxis } from "recharts";
import { db } from "@/lib/firebase";
import { PAGES } from "@/lib/constants";
import type { ElectionAnalyticsSummary } from "@/lib/election-analytics-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ArrowLeft } from "lucide-react";

const numberFmt = new Intl.NumberFormat("en-US");
const pct = (value: number) => `${value.toFixed(2)}%`;

const chartConfig = {
  uniqueVoters: { label: "Unique voters", color: "#b8962e" },
  votes: { label: "Votes", color: "#b8962e" },
  cumulativeVotes: { label: "Cumulative votes", color: "#1f1f1f" },
} satisfies ChartConfig;

const ElectionAnalyticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<ElectionAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const snap = await getDoc(doc(db, "election_analytics", id));
      if (snap.exists()) {
        setSummary(snap.data() as ElectionAnalyticsSummary);
      } else {
        setSummary(null);
      }
      setLoading(false);
    };
    run();
  }, [id]);

  const sortedPositions = useMemo(
    () =>
      summary
        ? [...summary.results.positions].sort((a, b) => a.title.localeCompare(b.title))
        : [],
    [summary],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={PAGES.admin.electionResults(id)}
          className="mb-2 inline-flex items-center gap-1 font-sans text-xs text-muted-gray hover:text-charcoal"
        >
          <ArrowLeft className="size-3.5" />
          Back to Results
        </Link>
        <h1 className="font-serif text-2xl font-bold md:text-3xl lg:text-4xl">
          Election Analytics
        </h1>
      </div>

      {!summary ? (
        <Card className="rounded-none border-dashed bg-gold-tint/20">
          <CardHeader>
            <CardTitle className="font-serif text-xl font-semibold text-charcoal">
              No summary yet
            </CardTitle>
          </CardHeader>
          <CardContent className="font-sans text-sm text-muted-gray">
            <p>
              Analytics summary has not been generated for this election yet. It
              will appear here once the summary script runs.
            </p>
            <p className="mt-3">
              Run:
              <span className="ml-1 rounded bg-secondary px-2 py-1 font-mono text-xs text-charcoal">
                npm run generate-analytics -- {id}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-none font-sans">
              Schema v{summary.schemaVersion}
            </Badge>
            <Badge variant="secondary" className="rounded-none font-sans">
              Generated {new Date(summary.generatedAt).toLocaleString()}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-sans text-xs uppercase tracking-wider text-muted-gray">
                  Eligible voters
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-2xl font-bold">
                {numberFmt.format(summary.turnout.eligibleVoters)}
              </CardContent>
            </Card>
            <Card className="rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-sans text-xs uppercase tracking-wider text-muted-gray">
                  Unique voters
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-2xl font-bold">
                {numberFmt.format(summary.turnout.uniqueVoters)}
              </CardContent>
            </Card>
            <Card className="rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-sans text-xs uppercase tracking-wider text-muted-gray">
                  Turnout rate
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-2xl font-bold">
                {pct(summary.turnout.turnoutRate)}
              </CardContent>
            </Card>
            <Card className="rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-sans text-xs uppercase tracking-wider text-muted-gray">
                  Ballot records
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-2xl font-bold">
                {numberFmt.format(summary.integrity.ballotRecords)}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle className="font-sans text-lg font-semibold text-charcoal">
                  Participation by level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={summary.byLevel} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="level" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="uniqueVoters" fill="var(--color-uniqueVoters)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader>
                <CardTitle className="font-sans text-lg font-semibold text-charcoal">
                  Voting timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={summary.timeline.cumulative} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="votes" stroke="var(--color-votes)" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="cumulativeVotes"
                      stroke="var(--color-cumulativeVotes)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="font-serif text-lg font-semibold text-charcoal">
                Winners Board
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.results.winnersBoard.map((item) => (
                <div key={item.positionId} className="border border-border p-3 font-sans">
                  <p className="text-xs uppercase tracking-wider text-muted-gray">
                    {item.positionTitle}
                  </p>
                  <p className="mt-1 text-base font-semibold text-charcoal">
                    {item.winnerName}
                  </p>
                  <p className="mt-1 text-sm text-muted-gray">
                    {numberFmt.format(item.winnerVotes)} votes ({pct(item.winnerPercentage)})
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-lg font-semibold text-charcoal">
                  Closest Race
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-sm">
                {summary.results.competitiveness.closestRace ? (
                  <p>
                    {summary.results.competitiveness.closestRace.positionTitle}:{" "}
                    {summary.results.competitiveness.closestRace.voteDifference} votes (
                    {pct(summary.results.competitiveness.closestRace.percentagePointDifference)})
                  </p>
                ) : (
                  <p className="text-muted-gray">Not enough data.</p>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle className="font-serif text-lg font-semibold text-charcoal">
                  Most Decisive Race
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-sm">
                {summary.results.competitiveness.mostDecisiveRace ? (
                  <p>
                    {summary.results.competitiveness.mostDecisiveRace.positionTitle}:{" "}
                    {summary.results.competitiveness.mostDecisiveRace.voteDifference} votes (
                    {pct(
                      summary.results.competitiveness.mostDecisiveRace.percentagePointDifference,
                    )}
                    )
                  </p>
                ) : (
                  <p className="text-muted-gray">Not enough data.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="font-sans text-xl font-bold">Per-position distribution</h2>
            {sortedPositions.map((position) => (
              <Card key={position.positionId} className="rounded-none">
                <CardHeader>
                  <CardTitle className="font-sans text-lg font-semibold text-charcoal">
                    {position.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[320px] w-full">
                    <BarChart data={position.candidates} layout="vertical" margin={{ left: 24, right: 16 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={120}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="votes" fill="#b8962e" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="font-serif text-lg font-semibold text-charcoal">
                Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-sm">
              <p>
                Ballot records: {numberFmt.format(summary.integrity.ballotRecords)}
              </p>
              <p>
                Inferred unique voters:{" "}
                {numberFmt.format(summary.integrity.inferredUniqueVoters)}
              </p>
              <p>
                Duplicate vote records detected:{" "}
                {summary.integrity.duplicateBallotsDetected ? "Yes" : "No"}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ElectionAnalyticsPage;
