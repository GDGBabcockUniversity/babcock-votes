"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { DEPARTMENTS, PAGES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import type { EligibleVoter } from "@/lib/types";
import { matricToDocId } from "@/lib/utils";

type Step = "matric" | "confirm";

const RegisterPage = () => {
  const router = useRouter();
  const { firebaseUser, loading: authLoading, refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>("matric");
  const [matricNumber, setMatricNumber] = useState("");
  const [voterData, setVoterData] = useState<EligibleVoter | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const safeMatric = matricNumber.trim();
    const matricRegex = /^\d{2}\/\d{4}$/;

    if (!matricRegex.test(safeMatric)) {
      setError("Matric number must be in format XX/XXXX (e.g., 21/0456).");
      return;
    }

    setSubmitting(true);
    try {
      const docId = matricToDocId(safeMatric);
      const snap = await getDoc(doc(db, "eligible_voters", docId));

      if (!snap.exists()) {
        setError(
          "You are not listed as an eligible voter. Please contact your association admin.",
        );
        return;
      }

      const data = snap.data() as EligibleVoter;

      if (data.claimedByUid) {
        setError(
          "This matric number has already been registered. If this is an error, please contact your association admin.",
        );
        return;
      }

      setVoterData(data);
      setStep("confirm");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!firebaseUser || !voterData) return;

    setError("");
    setSubmitting(true);

    try {
      const safeMatric = matricNumber.trim();
      const docId = matricToDocId(safeMatric);
      const batch = writeBatch(db);

      // Claim the eligible_voters doc
      batch.update(doc(db, "eligible_voters", docId), {
        claimedByUid: firebaseUser.uid,
        claimedEmail: firebaseUser.email,
      });

      // Create the user profile
      batch.set(doc(db, "users", firebaseUser.uid), {
        email: firebaseUser.email,
        fullName: voterData.fullName,
        matricNumber: safeMatric,
        departmentId: voterData.departmentId,
        level: voterData.level,
        role: "voter",
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      await refreshProfile();
    } catch {
      setError(
        "Registration failed. This matric may have just been claimed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    setStep("matric");
    setVoterData(null);
    setMatricNumber("");
    setError("");
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!firebaseUser) {
    router.replace(PAGES.auth.login);
    return null;
  }

  return (
    <div className="border border-border bg-white p-8 shadow-sm">
      <h1 className="text-center font-serif text-2xl md:text-3xl lg:text-4xl font-bold italic">
        Complete Registration
      </h1>
      <p className="mt-1 text-center text-xs uppercase tracking-widest text-muted-gray">
        &mdash; Verify your eligibility &mdash;
      </p>

      {step === "matric" && (
        <form onSubmit={handleLookup} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block lg:text-lg font-medium">
              Matric. Number
            </label>
            <Input
              type="text"
              placeholder="e.g., 21/0456"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-center text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center font-sans justify-center gap-2 bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Looking up..." : "Look me up"}
          </button>
        </form>
      )}

      {step === "confirm" && voterData && (
        <div className="mt-6 space-y-4">
          <p className="text-center text-sm text-muted-gray">Is this you?</p>

          <div className="space-y-3 border border-border bg-background p-5">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-gray">
                Name
              </span>
              <p className="font-medium text-lg">{voterData.fullName}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-gray">
                Matric Number
              </span>
              <p className="font-medium">{matricNumber.trim()}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-gray">
                Department
              </span>
              <p className="font-medium">
                {DEPARTMENTS.find((d) => d.id === voterData.departmentId)?.name}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-gray">
                Level
              </span>
              <p className="font-medium">{voterData.level}</p>
            </div>
          </div>

          {error && <p className="text-center text-xs text-red-600">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="border border-border py-3 text-sm font-sans font-medium text-charcoal transition-colors hover:border-gold/50 disabled:opacity-50"
            >
              That&rsquo;s not me
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="bg-gold py-3 text-sm font-sans font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Confirm & Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
