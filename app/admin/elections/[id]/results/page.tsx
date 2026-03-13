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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, Vote } from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const ResultsPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voterCount, setVoterCount] = useState(0);
  const [voters, setVoters] = useState<{ name: string; matric: string; votedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

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
      setCandidates(
        candSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Candidate),
      );

      // Get votes for this election
      const votesSnap = await getDocs(
        query(collection(db, "votes"), where("electionId", "==", id)),
      );
      setTotalVotes(votesSnap.size);

      // Unique voters
      const voterIds = [
        ...new Set(votesSnap.docs.map((d) => d.data().voterId as string)),
      ];
      setVoterCount(voterIds.length);

      // Fetch voter details
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
    <div>
      <button
        onClick={() => router.push(PAGES.admin.electionDetail(id))}
        className="mb-2 flex items-center gap-1 text-xs font-sans text-muted-gray hover:text-charcoal"
      >
        <ArrowLeft className="size-3.5" /> Back to Election
      </button>

      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">Results</h1>
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
      <div className="mt-4 space-y-6">
        {grouped.map(({ position, candidates: cands, totalForPos }) => (
          <Card key={position.id}>
            <CardHeader>
              <CardTitle className="text-lg font-serif md:text-2xl font-semibold">{position.title}</CardTitle>
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
                <p className="text-sm font-sans text-muted-gray">No candidates.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-6" />

      {/* Voter log */}
      <h2 className="font-serif text-xl font-bold">Voter Log</h2>
      <p className="mt-1 text-xs font-sans text-muted-gray">
        Who has voted (ballot choices are secret).
      </p>
      <div className="mt-4 border border-border">
        <Table className="font-sans rounded-none">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Matric No.</TableHead>
              <TableHead>Voted At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm font-sans text-muted-gray">
                  No votes yet.
                </TableCell>
              </TableRow>
            ) : (
              voters.map((v, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium pl-4">{v.name}</TableCell>
                  <TableCell className="text-muted-gray">{v.matric}</TableCell>
                  <TableCell className="text-muted-gray">{v.votedAt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ResultsPage;
