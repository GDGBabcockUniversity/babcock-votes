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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, Vote } from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const PublicResultsPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voterCount, setVoterCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      router.replace(PAGES.main.electionDetail(id));
      return;

      // TODO: remove the block above when public results should be a thing

      const elRef = doc(db, "elections", id);
      const elSnap = await getDoc(elRef);
      if (!elSnap.exists()) {
        setLoading(false);
        return;
      }

      const elData = { id: elSnap.id, ...elSnap.data() } as Election;

      if (elData.status !== "closed") {
        router.replace(PAGES.main.electionDetail(id));
        return;
      }

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

      // Get votes for this election
      const votesSnap = await getDocs(
        query(collection(db, "votes"), where("electionId", "==", id)),
      );
      setTotalVotes(votesSnap.size);

      // Dynamically tally candidate votes
      const votesData = votesSnap.docs.map((d) => d.data());
      const talliedCands = candItems.map((c) => ({
        ...c,
        voteCount: votesData.filter((v) => v.candidateId === c.id).length,
      }));
      setCandidates(talliedCands);

      // Unique voters
      const voterIds = [
        ...new Set(votesSnap.docs.map((d) => d.data().voterId as string)),
      ];
      setVoterCount(voterIds.length);
      setLoading(false);
    };
    fetch();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center text-sm font-sans text-muted-gray">
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

  return (
    <div className="mx-auto max-w-5xl py-8 px-4">
      <button
        onClick={() => router.push(PAGES.main.electionDetail(id))}
        className="mb-2 flex items-center gap-1 text-xs font-sans text-muted-gray hover:text-charcoal"
      >
        <ArrowLeft className="size-3.5" /> Back to Election
      </button>

      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
        Public Results
      </h1>
      <p className="mt-1 text-sm font-sans text-muted-gray">{election.title}</p>

      {/* Overview cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-sans font-medium uppercase tracking-wider text-muted-gray">
              Total Ballots
            </CardTitle>
            <Vote className="size-4 text-gold" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-sans font-bold">{totalVotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-sans font-medium uppercase tracking-wider text-muted-gray">
              Unique Voters
            </CardTitle>
            <Users className="size-4 text-gold" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-sans font-bold">{voterCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-sans font-medium uppercase tracking-wider text-muted-gray">
              Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-sans font-bold">{positions.length}</p>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Per-position results */}
      <h2 className="font-serif text-xl font-bold">Vote Breakdown</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {grouped.map(({ position, candidates: cands, totalForPos }) => (
          <Card key={position.id}>
            <CardHeader>
              <CardTitle className="text-lg font-serif md:text-2xl font-semibold">
                {position.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cands.map((c, idx) => {
                const pct =
                  totalForPos > 0
                    ? Math.round((c.voteCount / totalForPos) * 100)
                    : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm font-sans">
                      <span className="font-medium">
                        {idx === 0 && c.voteCount > 0 && (
                          <Badge variant="default" className="mr-2 text-[10px]">
                            Winning
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
                <p className="text-sm font-sans text-muted-gray">
                  No candidates.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PublicResultsPage;
