"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { errorMessage } from "@/lib/errors";
import { DEPARTMENTS, MATRIC_REGEX, PAGES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import type { EligibleVoter } from "@/lib/types";

type Step = "matric" | "confirm";

const RegisterPage = () => {
  const router = useRouter();
  const { authUser, loading: authLoading, signOut } = useAuth();
  const convex = useConvex();
  const register = useMutation(api.registration.register);

  const [step, setStep] = useState<Step>("matric");
  const [matricNumber, setMatricNumber] = useState("");
  const [voterData, setVoterData] = useState<EligibleVoter | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const safeMatric = matricNumber.trim();

    if (!MATRIC_REGEX.test(safeMatric)) {
      setError(
        "Matric number must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222).",
      );
      return;
    }

    setSubmitting(true);
    try {
      const data = await convex.query(api.registration.lookup, {
        matric: safeMatric,
      });
      setVoterData(data);
      setStep("confirm");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!authUser || !voterData) return;

    setError("");
    setSubmitting(true);

    try {
      // Claims the voter record and creates the profile atomically; the
      // profile query is live, so the page moves on by itself.
      await register({ matric: matricNumber.trim() });
    } catch (err) {
      setError(errorMessage(err, "Registration failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // Not signed in: back to login. Navigating has to happen in an effect, not while rendering.
  useEffect(() => {
    if (!authLoading && !authUser) router.replace(PAGES.auth.login);
  }, [authLoading, authUser, router]);

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

  if (!authUser) return null;

  return (
    <div className="rounded-sm border border-border bg-card p-8 shadow-sm">
      <h1 className="text-center font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
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

          {error && <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center font-sans justify-center gap-2 rounded-sm bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Looking up..." : "Look me up"}
          </button>
        </form>
      )}

      {step === "confirm" && voterData && (
        <div className="mt-6 space-y-4">
          <p className="text-center text-sm text-muted-gray">Is this you?</p>

          <div className="space-y-3 rounded-sm border border-border bg-background p-5">
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

          {error && <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="rounded-sm border border-border py-3 text-sm font-sans font-medium text-foreground transition-colors hover:border-gold/50 disabled:opacity-50"
            >
              That&rsquo;s not me
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-sm bg-gold py-3 text-sm font-sans font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Confirm & Continue"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={signOut}
          type="button"
          className="text-xs text-muted-gray underline hover:text-foreground transition-colors font-sans"
        >
          Signed in as{" "}
          <span className="font-semibold text-foreground">
            {authUser.email}
          </span>
          . Not you? Sign out.
        </button>
      </div>
    </div>
  );
};

export default RegisterPage;
