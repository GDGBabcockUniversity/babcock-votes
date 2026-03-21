"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { StatusBadge } from "@/components/status-badge";
import { CandidateCard } from "@/components/candidate-card";
import {
  CandidateCardSkeleton,
  SkeletonLoader,
} from "@/components/skeleton-loader";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const formatDateRange = (
  start: { seconds: number },
  end: { seconds: number },
) => {
  const fmt = (ts: { seconds: number }) =>
    new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
};

const CandidatesPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const elRef = doc(db, "elections", id);
      const elSnap = await getDoc(elRef);
      if (!elSnap.exists()) return;

      setElection({ id: elSnap.id, ...elSnap.data() } as Election);

      const [posSnap, candSnap] = await Promise.all([
        getDocs(query(collection(elRef, "positions"), orderBy("order", "asc"))),
        getDocs(collection(elRef, "candidates")),
      ]);

      setPositions(
        posSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Position),
      );
      setCandidates(
        candSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Candidate),
      );
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="-mx-4 -mt-6">
        <div className="bg-linear-to-b from-charcoal to-charcoal/90 px-4 pb-6 pt-4">
          <div className="mx-auto max-w-5xl">
            <div className="mt-8 flex flex-col gap-3">
              <SkeletonLoader className="h-8 w-3/4 opacity-20" />
              <div className="flex gap-4">
                <SkeletonLoader className="h-4 w-1/4 opacity-20" />
                <SkeletonLoader className="h-4 w-1/5 opacity-20" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="mx-auto max-w-5xl">
            <SkeletonLoader className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-2 gap-3">
              <CandidateCardSkeleton />
              <CandidateCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center text-sm text-muted-gray font-sans">
        Election not found.
      </p>
    );
  }

  const grouped = positions.map((pos) => ({
    position: pos,
    candidates: candidates.filter((c) => c.positionId === pos.id),
  }));

  return (
    <div className="-mx-4 -mt-6">
      {/* Dark header */}
      <div className="bg-linear-to-b from-charcoal to-charcoal/90 px-4 pb-6 pt-4 text-white">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="mt-4">
            <StatusBadge status={election.status} />
          </div>

          <h1 className="mt-3 font-serif text-2xl md:text-3xl lg:text-4xl font-bold italic">
            {election.title}
          </h1>

          <div className="mt-2 flex items-center gap-4 text-xs md:text-sm text-white/60 font-sans">
            <span className="flex items-center gap-2 font-medium">
              <Calendar className="size-3.5 md:size-4 lg:size-5" />
              {formatDateRange(election.startDate, election.endDate)}
            </span>
            <span className="flex items-center gap-2 font-medium">
              <Users className="size-3.5 md:size-4 lg:size-5" />
              {election.candidateCount} cand
              {election.candidateCount === 1 ? "idate" : "idates"}
            </span>
          </div>
        </div>
      </div>

      {/* Candidates by position */}
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-xl md:text-2xl lg:text-3xl font-semibold italic text-gold">
            The Candidates
          </h2>

          {grouped.map(({ position, candidates: cands }) => (
            <section key={position.id} className="mt-6">
              <h3 className="text-sm md:text-base lg:text-lg font-sans font-semibold uppercase tracking-wider text-charcoal">
                {position.title}
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {cands.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </section>
          ))}

          {election.status === "active" && (
            <div className="mt-8">
              {userProfile?.departmentId === election.departmentId ? (
                <Link
                  href={PAGES.main.vote(id)}
                  className="block w-full rounded-lg bg-gold py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Vote Now
                </Link>
              ) : (
                <div className="rounded-lg border border-border bg-secondary p-4 text-center text-sm text-muted-gray font-sans">
                  You can only vote in your own department&apos;s elections.
                </div>
              )}
            </div>
          )}

          {/* {election.status === "closed" && (
            <div className="mt-8">
              <Link
                href={PAGES.main.electionResults(id)}
                className="block w-full rounded-lg bg-gold py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                View Public Results 
              </Link>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default CandidatesPage;
