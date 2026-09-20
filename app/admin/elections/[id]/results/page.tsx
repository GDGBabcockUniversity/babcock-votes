"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRef } from "react";
import { ResultsPoster } from "@/components/results-poster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  UserCheck,
  FileDown,
  ChartColumn,
} from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const ResultsPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const posterRef = useRef<HTMLDivElement>(null);

  const detail = useQuery(api.elections.detail, { id });
  const election: Election | null = detail?.election ?? null;
  const positions: Position[] = detail?.positions ?? [];

  // Tallies come from server-side counters, so they stay live while votes come in.
  const tallies = useQuery(api.votes.tallies, election ? { electionId: id } : "skip");
  const eligibleVoterCountData = useQuery(
    api.eligibleVoters.countByDepartment,
    election ? { departmentId: election.departmentId } : "skip",
  );
  const eligibleVoterCount = eligibleVoterCountData ?? 0;
  const analyticsReady = useQuery(
    api.analytics.exists,
    election ? { electionId: id } : "skip",
  );

  const loading =
    detail === undefined ||
    (election !== null &&
      (tallies === undefined || eligibleVoterCountData === undefined));

  const candidates: (Candidate & { voteCount: number })[] = (
    detail?.candidates ?? []
  ).map((c) => ({ ...c, voteCount: tallies?.candidateVotes[c.id] ?? 0 }));
  const positionVoterCounts: Record<string, number> = tallies?.positionVotes ?? {};
  const positionAbstainCounts: Record<string, number> = tallies?.positionAbstains ?? {};

  // Unique voters: the most votes on any single position (accurate even when
  // some positions are restricted to certain levels).
  const voterCount =
    positions.length > 0
      ? Math.max(0, ...positions.map((p) => positionVoterCounts[p.id] ?? 0))
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center font-sans text-sm text-muted-gray">
        Election not found.
      </p>
    );
  }

  const grouped = positions.map((pos) => {
    const cands = candidates
      .filter((c) => c.positionId === pos.id)
      .sort((a, b) => b.voteCount - a.voteCount);
    const totalForPos = cands.reduce((sum, c) => sum + c.voteCount, 0);
    return { position: pos, candidates: cands, totalForPos };
  });

  const handleExportPdf = async () => {
    if (!posterRef.current) return;

    const images = posterRef.current.querySelectorAll("img");
    const originalSrcs: string[] = [];

    // Compress each image to a small JPEG before printing
    await Promise.all(
      Array.from(images).map(async (img, i) => {
        originalSrcs[i] = img.src;

        try {
          // Load the image into a temporary Image to get pixel data
          const tempImg = new window.Image();
          tempImg.crossOrigin = "anonymous";
          tempImg.src = img.src;

          await new Promise<void>((resolve) => {
            if (tempImg.complete && tempImg.naturalHeight > 0) {
              resolve();
            } else {
              tempImg.onload = () => resolve();
              tempImg.onerror = () => resolve();
            }
          });

          if (tempImg.naturalHeight === 0) return; // Skip broken images

          // Downscale to 128x128 and compress as JPEG
          const canvas = document.createElement("canvas");
          const size = 128;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Draw cropped & centered (cover behavior)
          const scale = Math.max(
            size / tempImg.naturalWidth,
            size / tempImg.naturalHeight,
          );
          const sw = size / scale;
          const sh = size / scale;
          const sx = (tempImg.naturalWidth - sw) / 2;
          const sy = (tempImg.naturalHeight - sh) / 2;
          ctx.drawImage(tempImg, sx, sy, sw, sh, 0, 0, size, size);

          img.src = canvas.toDataURL("image/jpeg", 0.7);
        } catch {
          // If compression fails, keep the original
        }
      }),
    );

    // Set a structured filename for the PDF
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().slice(0, 10);
    const electionName =
      election?.title?.replace(/[^\w\s-]/g, "").trim() || "Election";
    document.title = `BabcockVotes - ${electionName} - Results - ${dateStr}`;

    window.print();

    // Restore original page title and image sources after print dialog closes
    document.title = originalTitle;
    Array.from(images).forEach((img, i) => {
      if (originalSrcs[i]) img.src = originalSrcs[i];
    });
  };

  return (
    <>
      <div className="print:hidden">
        <button
          onClick={() => router.push(PAGES.admin.electionDetail(id))}
          className="mb-2 flex items-center gap-1 font-sans text-xs text-muted-gray hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Election
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold md:text-3xl lg:text-4xl">
              Results
            </h1>
            <p className="mt-1 font-sans text-sm text-muted-gray">
              {election.title}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={PAGES.admin.electionAnalytics(id)}>
              <Button variant="outline" className="font-sans rounded-sm">
                <ChartColumn className="mr-2 size-4" />
                Analytics
              </Button>
            </Link>
            {election.status === "closed" && (
              <Button
                onClick={handleExportPdf}
                disabled={candidates.length === 0}
                className="font-sans rounded-sm"
              >
                <FileDown className="mr-2 size-4" />
                Export as PDF
              </Button>
            )}
          </div>
        </div>

        {!analyticsReady && (
          <Card className="mt-4 rounded-sm border-dashed bg-gold-tint/20">
            <CardContent className="font-sans text-sm text-muted-gray">
              Analytics summary is not available yet. It will appear on the
              analytics page once generation completes.
            </CardContent>
          </Card>
        )}

        {/* Overview cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-muted-gray">
                Eligible Voters
              </CardTitle>
              <UserCheck className="size-4 text-gold-ink" />
            </CardHeader>
            <CardContent>
              <p className="font-sans text-2xl font-bold">
                {eligibleVoterCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-muted-gray">
                Voter Count (Turnout)
              </CardTitle>
              <Users className="size-4 text-gold-ink" />
            </CardHeader>
            <CardContent>
              <p className="font-sans text-2xl font-bold">
                {voterCount}{" "}
                <span className="text-base text-muted-gray font-medium">
                  ({((voterCount / eligibleVoterCount) * 100).toFixed(2)}%)
                </span>
              </p>
              {/* <p className="font-sans text-xs text-muted-gray">
                {voterCount} votes / {eligibleVoterCount} eligible voters
              </p> */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-muted-gray">
                Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-sans text-2xl font-bold">{positions.length}</p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        {/* Per-position results */}
        <h2 className="font-serif text-xl font-bold">Vote Breakdown</h2>
        <div className="mt-4 space-y-6">
          {grouped.map(({ position, candidates: cands }) => (
            <Card key={position.id}>
              <CardHeader>
                <CardTitle className="font-serif text-lg font-semibold md:text-2xl">
                  {position.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cands.map((c, idx) => {
                  const posTotal = positionVoterCounts[position.id] || 0;
                  const pct =
                    posTotal > 0
                      ? ((c.voteCount / posTotal) * 100).toFixed(2)
                      : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between font-sans text-sm">
                        <span className="font-medium">
                          {idx === 0 && c.voteCount > 0 && (
                            <Badge
                              variant="default"
                              className="mr-2 text-[10px]"
                            >
                              Leading
                            </Badge>
                          )}
                          {c.fullName}
                        </span>
                        <span className="text-muted-gray">
                          {c.voteCount} votes ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gold transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Abstain row */}
                {(() => {
                  const abstainCount = positionAbstainCounts[position.id] || 0;
                  const posTotal = positionVoterCounts[position.id] || 0;
                  const abstainPct =
                    posTotal > 0
                      ? ((abstainCount / posTotal) * 100).toFixed(2)
                      : 0;
                  return (
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between font-sans text-sm">
                        <span className="font-medium italic text-muted-gray">
                          Abstain
                        </span>
                        <span className="text-muted-gray">
                          {abstainCount} ({abstainPct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-muted-gray/40 transition-all"
                          style={{ width: `${abstainPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
                {cands.length === 0 && (
                  <p className="font-sans text-sm text-muted-gray">
                    No candidates.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Poster for PDF Export — visually hidden but in DOM so images preload */}
      <div className="overflow-hidden h-0 opacity-0 pointer-events-none print:h-auto print:opacity-100 print:overflow-visible print:pointer-events-auto print:absolute print:inset-0 print:bg-card print:z-50 print:m-0 print:p-0">
        <ResultsPoster
          ref={posterRef}
          election={election}
          positions={positions}
          candidates={candidates}
          voterCount={voterCount}
          eligibleVoterCount={eligibleVoterCount}
          positionVoterCounts={positionVoterCounts}
          positionAbstainCounts={positionAbstainCounts}
        />
      </div>
    </>
  );
};

export default ResultsPage;
