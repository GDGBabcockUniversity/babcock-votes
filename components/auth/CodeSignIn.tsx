"use client";
import React, { useEffect, useState } from "react";
import { Input, useFormManager } from "@t007/input/react";
import { Button } from "@/components/common/Button";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { errorMessage } from "@/lib/errors";
import { MATRIC_REGEX } from "@/lib/constants";

type Step = "matric" | "code";
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;
const MATRIC_PATTERN = MATRIC_REGEX.source.replace(/^\^|\$$/g, "");

export const CodeSignIn: React.FC<{ authError?: string }> = ({ authError }) => {
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

  const sendCode = async () => (await sendVoterCode(matricNumber.trim()), setCode(""), setCooldown(RESEND_SECONDS));
  const startOver = () => (setStep("matric"), setCode(""), setError(""), setNotice(""));
  const handleRequest = async () => {
    (setError(""), setSubmitting(true));
    try {
      const { maskedEmail } = await convex.query(api.voterOtp.lookup, { matric: matricNumber.trim() });
      await sendCode();
      (setMaskedEmail(maskedEmail), setNotice(""), setStep("code"));
    } catch (err) {
      setError(errorMessage(err, "We couldn't send the code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };
  const handleResend = async () => {
    (setError(""), setSubmitting(true));
    try {
      await sendCode();
      setNotice("We've sent a new code. The previous one no longer works.");
    } catch (err) {
      setError(errorMessage(err, "We couldn't send the code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };
  const handleVerify = async () => {
    (setError(""), setSubmitting(true));
    try {
      await verifyVoterCode(matricNumber.trim(), code);
    } catch (err) {
      (setError(errorMessage(err, "That code is wrong or has expired. Check the latest email, or request a new code.")), setSubmitting(false));
    }
  };
  const { handleSubmit: handleMatricSubmit } = useFormManager(handleRequest);
  const { handleSubmit: handleCodeSubmit } = useFormManager(handleVerify);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <>
      {step === "matric" && (
        <form noValidate onSubmit={handleMatricSubmit} className="t007-input-form flex flex-col w-full">
          <div className="flex flex-col w-full">
            <label htmlFor="otp-matric" className="auth-field-label font-semibold">
              Matric number
            </label>
            <Input id="otp-matric" type="text" placeholder="e.g. 23/0039" value={matricNumber} onChange={(e) => (setMatricNumber(e.target.value), setError(""))} pattern={MATRIC_PATTERN} helperText={{ patternMismatch: "Matric number must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222)." }} error={error || authError} required />
          </div>
          <Button type="submit" variant="stamp" disabled={submitting} className="w-full">
            {submitting ? "Sending code..." : "Sign in"}
          </Button>
        </form>
      )}
      {step === "code" && (
        <form noValidate onSubmit={handleCodeSubmit} className="t007-input-form flex flex-col w-full">
          <div className="otp-box flex flex-col items-center text-center gap-1">
            <p className="otp-box-subtitle uppercase tracking-wider font-normal">Code sent to</p>
            <p className="otp-box-email font-semibold">{maskedEmail}</p>
            <p className="otp-box-hint font-normal">Enter the {CODE_LENGTH}-digit code from the email. It expires in 1 hour.</p>
          </div>
          <div className="flex flex-col w-full">
            <label htmlFor="otp-code" className="auth-field-label font-semibold">
              One-time code
            </label>
            <Input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" minLength={CODE_LENGTH} maxLength={CODE_LENGTH} pattern={`\\d{${CODE_LENGTH}}`} title={`Enter the ${CODE_LENGTH}-digit code`} value={code} onChange={(e) => (setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH)), setError(""))} fieldClassName="otp-input-digits font-mono text-center text-2xl" error={error} autoFocus required />
          </div>
          {notice && !error && <p className="text-center text-xs text-[var(--text-muted)]">{notice}</p>}
          <Button type="submit" variant="stamp" disabled={submitting} className="w-full">
            {submitting ? "Verifying..." : "Verify & Sign in"}
          </Button>
          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button" onClick={startOver} disabled={submitting} className="otp-change-link text-xs font-semibold">
              Change matric
            </button>
            <button type="button" onClick={handleResend} disabled={submitting || cooldown > 0} className="otp-resend-link text-xs font-semibold hover:underline disabled:opacity-50">
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </>
  );
};
