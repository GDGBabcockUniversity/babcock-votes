"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { errorMessage } from "@/lib/errors";
import { MATRIC_REGEX, PAGES } from "@/lib/constants";
import { Input } from "@/components/ui/input";

type Step = "matric" | "code";

/** Must match VOTER_OTP_RESEND_MS in convex/lib/voterOtp.ts. */
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

/**
 * Matric number -> a 6-digit code is emailed to the student's address (the
 * personal email for an imported class list) -> entering it signs them in,
 * and the auth layout moves them on. Used on the login page's Student tab and
 * inside `VoterCodeForm` on /register.
 */
export const VoterCodeSignIn = () => {
  const convex = useConvex();
  const { sendVoterCode, verifyVoterCode } = useAuth();

  const [step, setStep] = useState<Step>("matric");
  const [matricNumber, setMatricNumber] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    await sendVoterCode(matricNumber.trim());
    setCode("");
    setCooldown(RESEND_SECONDS);
  };

  const handleRequest = async (e: React.FormEvent) => {
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
      const { maskedEmail } = await convex.query(api.voterOtp.lookup, {
        matric: safeMatric,
      });
      await sendCode();
      setMaskedEmail(maskedEmail);
      setNotice("");
      setStep("code");
    } catch (err) {
      setError(errorMessage(err, "We couldn't send the code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSubmitting(true);
    try {
      await sendCode();
      setNotice("We've sent a new code. The previous one no longer works.");
    } catch (err) {
      setError(errorMessage(err, "We couldn't send the code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      return;
    }

    setSubmitting(true);
    try {
      // Once signed in, the auth layout sends the student on.
      await verifyVoterCode(matricNumber.trim(), code);
    } catch (err) {
      setError(
        errorMessage(
          err,
          "That code is wrong or has expired. Check the latest email, or request a new code.",
        ),
      );
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setStep("matric");
    setCode("");
    setError("");
    setNotice("");
  };

  return (
    <>
      {step === "matric" && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label htmlFor="otp-matric" className="mb-2 block lg:text-lg font-medium">
              Matric. Number
            </label>
            <Input
              id="otp-matric"
              type="text"
              placeholder="e.g., 20/3041"
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
            {submitting ? "Sending code..." : "Login"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="rounded-sm border border-border bg-secondary/40 px-4 py-3 text-center font-sans">
            <p className="text-xs uppercase tracking-wider text-muted-gray">Code sent to</p>
            <p className="mt-1 text-base font-semibold">{maskedEmail}</p>
            <p className="mt-1 text-xs text-muted-gray">
              Enter the {CODE_LENGTH}-digit code from the email. It expires in 1 hour.
            </p>
          </div>
          <div>
            <label htmlFor="otp-code" className="mb-2 block lg:text-lg font-medium">
              One-time code
            </label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
              className="text-center font-mono text-2xl tracking-[0.5em]"
              autoFocus
              required
            />
          </div>

          {notice && !error && (
            <p className="text-center font-sans text-xs text-muted-gray">{notice}</p>
          )}
          {error && <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || code.length !== CODE_LENGTH}
            className="flex w-full items-center font-sans justify-center gap-2 rounded-sm bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify & Login"}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startOver}
              disabled={submitting}
              className="rounded-sm border border-border py-3 text-sm font-sans font-medium text-foreground transition-colors hover:border-gold/50 disabled:opacity-50"
            >
              Change matric
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={submitting || cooldown > 0}
              className="rounded-sm border border-border py-3 text-sm font-sans font-medium text-foreground transition-colors hover:border-gold/50 disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
            </button>
          </div>
          <p className="text-center font-sans text-xs text-muted-gray">
            Can&rsquo;t find it? Check your spam folder.
          </p>
        </form>
      )}

    </>
  );
};

/** The code sign-in as a page of its own (signed-out /register). */
export const VoterCodeForm = () => (
  <div className="rounded-sm border border-border bg-card p-8 shadow-sm">
    <h1 className="text-center font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
      Sign In to Vote
    </h1>
    <p className="mt-1 text-center text-xs uppercase tracking-widest text-muted-gray">
      &mdash; We&rsquo;ll email you a code &mdash;
    </p>
    <div className="mt-6">
      <VoterCodeSignIn />
    </div>
    <div className="mt-8 text-center">
      <Link
        href={PAGES.auth.login}
        className="text-xs text-muted-gray underline hover:text-foreground transition-colors font-sans"
      >
        Sign in another way
      </Link>
    </div>
  </div>
);
