"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRef } from "react";
import { ResultsPoster } from "@/components/results-poster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Users,
  Vote,
  ChevronLeft,
  ChevronRight,
  FileDown,
} from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const VOTER_PAGE_SIZE = 25;

const ResultsPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<
    (Candidate & { voteCount: number })[]
  >([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voterCount, setVoterCount] = useState(0);
  const [voters, setVoters] = useState<
    { name: string; matric: string; votedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [voterPage, setVoterPage] = useState(1);

  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const elRef = doc(db, "elections", id);
      const elSnap = await getDoc(elRef);
      if (!elSnap.exists()) {
        setLoading(false);
        return;
      }

      const elData = { id: elSnap.id, ...elSnap.data() } as Election;
      setElection(elData);

      const [posSnap, candSnap] = await Promise.all([
        getDocs(query(collection(elRef, "positions"), orderBy("order", "asc"))),
        getDocs(collection(elRef, "candidates")),
      ]);

      const posItems = posSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Position,
      );
      setPositions(posItems);
      const candItems = candSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Candidate,
      );

      const votesSnap = await getDocs(
        query(collection(db, "votes"), where("electionId", "==", id)),
      );
      setTotalVotes(votesSnap.size);

      const votesData = votesSnap.docs.map((d) => d.data());
      const talliedCands = candItems.map((c) => ({
        ...c,
        voteCount: votesData.filter((v) => v.candidateId === c.id).length,
      }));
      setCandidates(talliedCands);

      const voterIds = [
        ...new Set(votesSnap.docs.map((d) => d.data().voterId as string)),
      ];
      setVoterCount(voterIds.length);

      const voterDetails = await Promise.all(
        voterIds.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          const data = userSnap.data();
          const vote = votesSnap.docs.find((d) => d.data().voterId === uid);
          const votedAt = vote?.data().votedAt;
          return {
            name: data?.fullName ?? "Unknown",
            matric: data?.matricNumber ?? "—",
            votedAt: votedAt?.seconds
              ? new Date(votedAt.seconds * 1000).toLocaleString()
              : votedAt instanceof Date
                ? votedAt.toLocaleString()
                : "—",
          };
        }),
      );
      setVoters(voterDetails);
      setLoading(false);
    };
    fetch();
  }, [id]);

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

  const voterTotalPages = Math.max(
    1,
    Math.ceil(voters.length / VOTER_PAGE_SIZE),
  );
  const pagedVoters = voters.slice(
    (voterPage - 1) * VOTER_PAGE_SIZE,
    voterPage * VOTER_PAGE_SIZE,
  );

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <>
      <div className="print:hidden">
        <button
          onClick={() => router.push(PAGES.admin.electionDetail(id))}
          className="mb-2 flex items-center gap-1 font-sans text-xs text-muted-gray hover:text-charcoal"
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

          {election.status === "closed" && (
            <Button
              onClick={handleExportPdf}
              disabled={candidates.length === 0}
              className="font-sans rounded-none"
            >
              <FileDown className="mr-2 size-4" />
              Export as PDF
            </Button>
          )}
        </div>

        {/* Overview cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-muted-gray">
                Total Ballots
              </CardTitle>
              <Vote className="size-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="font-sans text-2xl font-bold">{totalVotes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-muted-gray">
                Unique Voters
              </CardTitle>
              <Users className="size-4 text-gold" />
            </CardHeader>
            <CardContent>
              <p className="font-sans text-2xl font-bold">{voterCount}</p>
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
          {grouped.map(({ position, candidates: cands, totalForPos }) => (
            <Card key={position.id}>
              <CardHeader>
                <CardTitle className="font-serif text-lg font-semibold md:text-2xl">
                  {position.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cands.map((c, idx) => {
                  const denominator =
                    cands.length > 1 ? totalForPos : voterCount;
                  const pct =
                    denominator > 0
                      ? ((c.voteCount / denominator) * 100).toFixed(2)
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
                      <div className="mt-1 h-2 w-full bg-secondary">
                        <div
                          className="h-full bg-gold transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {cands.length === 0 && (
                  <p className="font-sans text-sm text-muted-gray">
                    No candidates.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Voter log */}
        <h2 className="font-serif text-xl font-bold">Voter Log</h2>
        <p className="mt-1 font-sans text-xs text-muted-gray">
          Who has voted (ballot choices are secret). {voters.length} total voter
          {voters.length !== 1 ? "s" : ""}.
        </p>
        <div className="mt-4 border border-border">
          <Table className="rounded-none font-sans">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Matric No.</TableHead>
                <TableHead>Voted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedVoters.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center font-sans text-sm text-muted-gray"
                  >
                    No votes yet.
                  </TableCell>
                </TableRow>
              ) : (
                pagedVoters.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4 font-medium">{v.name}</TableCell>
                    <TableCell className="text-muted-gray">
                      {v.matric}
                    </TableCell>
                    <TableCell className="text-muted-gray">
                      {v.votedAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Voter Log Pagination */}
        {voterTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-between font-sans text-sm">
            <span className="text-muted-gray">
              Page {voterPage} of {voterTotalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={voterPage <= 1}
                onClick={() => setVoterPage((p) => p - 1)}
                className="rounded-none"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={voterPage >= voterTotalPages}
                onClick={() => setVoterPage((p) => p + 1)}
                className="rounded-none"
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Render for PDF Export - Shown ONLY in Print mode */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-50 print:m-0 print:p-0">
        <ResultsPoster
          ref={posterRef}
          election={election}
          positions={positions}
          candidates={candidates}
          voterCount={voterCount}
        />
      </div>
    </>
  );
};

export default ResultsPage;
