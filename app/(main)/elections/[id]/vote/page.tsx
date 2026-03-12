"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { AlertTriangle, Check } from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";

const VotePage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const elRef = doc(db, "elections", id);
      const elSnap = await getDoc(elRef);
      if (!elSnap.exists()) return;

      setElection({ id: elSnap.id, ...elSnap.data() } as Election);

      const [posSnap, candSnap] = await Promise.all([
        getDocs(
          query(collection(elRef, "positions"), orderBy("order", "asc")),
        ),
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

  const selectCandidate = (positionId: string, candidateId: string) => {
    if (reviewing) return;
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  };

  const allSelected = positions.every((p) => selections[p.id]);

  const handleSubmit = async () => {
    if (!firebaseUser || !allSelected) return;
    setSubmitting(true);

    try {
      const promises = positions.map((pos) => {
        const voteDocId = `${firebaseUser.uid}_${pos.id}`;
        return setDoc(doc(db, "votes", voteDocId), {
          electionId: id,
          positionId: pos.id,
          candidateId: selections[pos.id],
          voterId: firebaseUser.uid,
          votedAt: new Date(),
        });
      });

      await Promise.all(promises);
      router.replace(`/elections/${id}/confirmation`);
    } catch (err) {
      console.error("Vote submission failed:", err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center text-sm text-muted-gray">
        Election not found.
      </p>
    );
  }

  const grouped = positions.map((pos) => ({
    position: pos,
    candidates: candidates.filter((c) => c.positionId === pos.id),
  }));

  const getCandidateName = (candidateId: string) =>
    candidates.find((c) => c.id === candidateId)?.fullName ?? "";

  return (
    <div>
      {/* Header */}
      <div className="text-center">
        <span className="inline-block rounded-full border border-gold/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
          Official Ballot
        </span>
        <h1 className="mt-3 font-serif text-xl font-bold italic">
          {election.title}
        </h1>
      </div>

      {/* Voter info */}
      {userProfile && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-linear-to-r from-charcoal to-charcoal/80 px-4 py-3 text-white">
          <div className="flex size-10 items-center justify-center rounded-full bg-gold text-sm font-bold text-white">
            {userProfile.fullName.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">
              {userProfile.fullName}
            </p>
            <p className="text-[11px] text-white/60">
              {userProfile.matricNumber}
            </p>
          </div>
        </div>
      )}

      {/* Positions + candidates */}
      <div className="mt-6 space-y-6">
        {grouped.map(({ position, candidates: cands }) => (
          <section key={position.id}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-gray">
              {position.title}
            </h3>
            <div className="mt-2 space-y-2">
              {cands.map((c) => {
                const selected = selections[position.id] === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCandidate(position.id, c.id)}
                    disabled={reviewing}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-gold bg-gold/5"
                        : "border-border bg-white hover:border-gold/40"
                    } disabled:cursor-default`}
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                      {c.photoUrl ? (
                        <Image
                          src={c.photoUrl}
                          alt={c.fullName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-xs font-bold text-muted-gray">
                          {c.fullName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span
                      className={`flex-1 text-sm font-medium ${selected ? "italic" : ""}`}
                    >
                      {c.fullName}
                    </span>
                    <div
                      className={`flex size-6 items-center justify-center rounded-full border transition-colors ${
                        selected
                          ? "border-gold bg-gold text-white"
                          : "border-border"
                      }`}
                    >
                      {selected && <Check className="size-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Review section */}
      {reviewing && (
        <div className="mt-8 rounded-2xl border border-gold/30 bg-white p-5 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="size-8 text-gold" />
            <h2 className="mt-2 font-serif text-lg font-bold italic">
              Review Your Selections
            </h2>
            <p className="mt-1 text-xs text-muted-gray">
              Please verify your choices. Ballots are immutable and cannot be
              changed once submitted.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="flex items-center justify-between border-b border-border pb-2 last:border-0"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gold">
                    {pos.title}
                  </p>
                  <p className="text-sm font-semibold">
                    {getCandidateName(selections[pos.id])}
                  </p>
                </div>
                <button
                  onClick={() => setReviewing(false)}
                  className="text-xs font-semibold text-gold"
                >
                  Change
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setReviewing(false)}
              className="rounded-lg border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Edit Choices
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Ballot"}
            </button>
          </div>
        </div>
      )}

      {/* Submit / Review trigger */}
      {!reviewing && (
        <div className="mt-8">
          <button
            onClick={() => setReviewing(true)}
            disabled={!allSelected}
            className="w-full rounded-lg bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Review & Submit Ballot
          </button>
          {!allSelected && (
            <p className="mt-2 text-center text-xs text-muted-gray">
              Select a candidate for every position to continue.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VotePage;
