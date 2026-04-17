"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  doc,
  getDoc,
  getDocs,
  writeBatch,
  collection,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { AlertTriangle, Check } from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import { PAGES } from "@/lib/constants";

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
    if (!firebaseUser?.uid || !userProfile) return;

    const fetch = async () => {
      // Check if user has already voted
      const voteCheckQuery = query(
        collection(db, "votes"),
        where("electionId", "==", id),
        where("voterId", "==", firebaseUser.uid),
      );
      const voteSnap = await getDocs(voteCheckQuery);

      if (!voteSnap.empty) {
        // User already voted
        router.replace(PAGES.main.confirmation(id));
        return;
      }

      const elRef = doc(db, "elections", id);
      const elSnap = await getDoc(elRef);
      if (!elSnap.exists()) {
        setLoading(false);
        return;
      }

      const elData = { id: elSnap.id, ...elSnap.data() } as Election;

      if (elData.departmentId !== userProfile.departmentId) {
        router.replace(PAGES.main.electionDetail(id));
        return;
      }

      setElection(elData);

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
  }, [id, firebaseUser, userProfile, router]);

  const selectCandidate = (positionId: string, candidateId: string) => {
    if (reviewing) return;
    setSelections((prev) => {
      if (prev[positionId] === candidateId) {
        const next = { ...prev };
        delete next[positionId];
        return next;
      }
      return { ...prev, [positionId]: candidateId };
    });
  };

  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async () => {
    if (!firebaseUser) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      // Re-check election status before submitting
      const freshSnap = await getDoc(doc(db, "elections", id));
      if (!freshSnap.exists()) {
        setSubmitError("This election no longer exists.");
        setSubmitting(false);
        return;
      }
      const freshStatus = freshSnap.data().status;
      if (freshStatus !== "active") {
        setSubmitError("This election is no longer accepting votes.");
        setSubmitting(false);
        return;
      }

      const batch = writeBatch(db);

      const eligiblePositions = positions.filter((pos) => {
        if (!pos.allowedLevels || pos.allowedLevels.length === 0) return true;
        return pos.allowedLevels.includes(userProfile?.level || "");
      });

      eligiblePositions.forEach((pos) => {
        const voteDocId = `${firebaseUser.uid}_${pos.id}`;
        const voteRef = doc(db, "votes", voteDocId);
        batch.set(voteRef, {
          electionId: id,
          positionId: pos.id,
          candidateId: selections[pos.id] || "abstain",
          voterId: firebaseUser.uid,
          votedAt: new Date(),
        });
      });

      await batch.commit();
      router.replace(PAGES.main.confirmation(id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("PERMISSION_DENIED") ||
        message.includes("permission")
      ) {
        setSubmitError(
          "Your vote could not be submitted. The election may have been closed. Please refresh and try again.",
        );
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
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

  const eligiblePositions = positions.filter((pos) => {
    if (!pos.allowedLevels || pos.allowedLevels.length === 0) return true;
    return pos.allowedLevels.includes(userProfile?.level || "");
  });

  const grouped = eligiblePositions.map((pos) => ({
    position: pos,
    candidates: candidates.filter((c) => c.positionId === pos.id),
  }));

  const getCandidateName = (candidateId: string) => {
    if (!candidateId) return "Abstain";
    return candidates.find((c) => c.id === candidateId)?.fullName ?? "Abstain";
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center">
        <span className="font-sans inline-block rounded-full border border-gold/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
          Official Ballot
        </span>
        <h1 className="mt-3 font-serif text-xl font-bold">{election.title}</h1>
      </div>

      {/* Voter info */}
      {userProfile && (
        <div className="mt-5 font-sans flex items-center gap-3 bg-linear-to-r from-charcoal to-charcoal/80 px-4 py-3 text-white">
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
      <div className="mt-6 space-y-8 pb-6">
        {grouped.map(({ position, candidates: cands }) => (
          <section
            key={position.id}
            className="font-sans relative border border-border bg-white shadow-sm"
          >
            <div className="sticky top-0 z-10 border-b border-border/50 bg-white/95 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {position.title}
                </h3>
                {position.allowedLevels &&
                  position.allowedLevels.length > 0 && (
                    <span className="shrink-0 rounded bg-charcoal/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal">
                      {position.allowedLevels.join(", ")}L Only
                    </span>
                  )}
              </div>
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-gray">
                {cands.length === 1
                  ? "Vote of confidence"
                  : "Select 1 candidate"}
              </p>
            </div>
            <div className="space-y-3 p-4">
              {cands.map((c) => {
                const selected = selections[position.id] === c.id;
                const disapproved = selections[position.id] === "abstain";

                if (cands.length === 1) {
                  return (
                    <div
                      key={c.id}
                      className="border border-border bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                          {c.photoUrl ? (
                            <Image
                              src={c.photoUrl}
                              alt={c.fullName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex size-full items-center justify-center text-xs font-bold text-muted-gray">
                              {c.fullName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium">
                          {c.fullName}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() =>
                            setSelections((prev) => ({
                              ...prev,
                              [position.id]: c.id,
                            }))
                          }
                          className={`py-2 text-sm font-medium border transition-colors ${
                            selected
                              ? "bg-gold text-white border-gold"
                              : "border-border text-charcoal hover:border-gold/40"
                          } disabled:opacity-50`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() =>
                            setSelections((prev) => ({
                              ...prev,
                              [position.id]: "abstain",
                            }))
                          }
                          className={`py-2 text-sm font-medium border transition-colors ${
                            disapproved
                              ? "bg-charcoal text-white border-charcoal"
                              : "border-border text-charcoal hover:border-charcoal/40"
                          } disabled:opacity-50`}
                        >
                          Disapprove
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCandidate(position.id, c.id)}
                    disabled={reviewing}
                    className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-all ${
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
                          unoptimized
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
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
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
        <div className="mt-8 border border-gold/30 bg-white p-5 shadow-lg font-sans">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="size-8 text-gold" />
            <h2 className="mt-2 font-serif text-lg font-bold">
              Review Your Selections
            </h2>
            <p className="mt-1 text-xs text-muted-gray">
              Please verify your choices. Ballots are immutable and cannot be
              changed once submitted.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {eligiblePositions.map((pos) => (
              <div
                key={pos.id}
                className="flex items-center justify-between border-b border-border pb-2 last:border-0"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gold">
                    {pos.title}
                  </p>
                  <p
                    className={`text-sm font-semibold ${!selections[pos.id] || selections[pos.id] === "abstain" ? "italic text-muted-gray" : ""}`}
                  >
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

          {submitError && (
            <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setReviewing(false)}
              className="border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Edit Choices
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 bg-gold py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Ballot"}
            </button>
          </div>
        </div>
      )}

      {/* Submit / Review trigger */}
      {!reviewing && (
        <div className="mt-8 font-sans">
          <button
            onClick={() => setReviewing(true)}
            className="w-full bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Review & Submit Ballot
          </button>
          <p className="mt-2 text-center text-xs text-muted-gray">
            Positions without a selection will be recorded as abstain.
          </p>
        </div>
      )}
    </div>
  );
};

export default VotePage;
