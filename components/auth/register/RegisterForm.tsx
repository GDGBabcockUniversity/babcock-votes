"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Input, useFormManager } from "@t007/input/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { errorMessage } from "@/lib/errors";
import { MATRIC_REGEX, PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import type { EligibleVoter } from "@/lib/types";
import { Button, ButtonLink } from "@/components/common/Button";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import Footer from "@/components/common/Footer";

const MATRIC_PATTERN = MATRIC_REGEX.source.replace(/^\^|\$$/g, "");

export const RegisterForm: React.FC = () => {
  const { authUser, loading: authLoading, needsEmailConfirmation, signOut } = useAuth();
  const router = useRouter();
  const convex = useConvex();
  const register = useMutation(api.registration.register);
  const confirmEmailSignIn = useMutation(api.registration.confirmEmailSignIn);
  const emailVoterData = useQuery(api.registration.emailSignInConfirmation, authUser && needsEmailConfirmation ? {} : "skip");

  const [step, setStep] = useState<"matric" | "confirm">("matric");
  const [fullName, setFullName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [voterData, setVoterData] = useState<EligibleVoter | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeData = emailVoterData ?? (step === "confirm" ? voterData : null);
  const handleSignOut = async () => (await signOut(), router.replace(PAGES.auth.login));
  const handleLookup = async () => {
    const safeMatric = matricNumber.trim();
    const safeFullName = fullName.trim();
    if (!safeFullName) return setError("Please enter your full name.");
    if (!MATRIC_REGEX.test(safeMatric)) return setError("Matric number must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222).");
    (setError(""), setSubmitting(true));
    try {
      const data = await convex.query(api.registration.lookup, { matric: safeMatric, fullName: safeFullName });
      (setVoterData(data), setStep("confirm"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };
  const { handleSubmit: handleLookupSubmit } = useFormManager(handleLookup);
  const handleConfirm = async () => {
    (setError(""), setSubmitting(true));
    try {
      if (needsEmailConfirmation) await confirmEmailSignIn({});
      else await register({ matric: matricNumber.trim(), fullName: fullName.trim() });
    } catch (err) {
      setError(errorMessage(err, "Confirmation failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };
  const handleGoBack = () => (needsEmailConfirmation ? handleSignOut() : (setStep("matric"), setVoterData(null), setError("")));

  return (
    <section className="auth-form-panel flex flex-1 flex-col justify-between min-h-dvh">
      <header className="auth-topbar flex justify-end w-full">
        <ThemeToggle />
      </header>
      <div className="auth-form-center flex flex-auto flex-col items-center justify-center">
        <div className="auth-form-box flex flex-col w-full gap-5">
          {authLoading || (authUser && needsEmailConfirmation && emailVoterData === undefined) ? (
            <div className="flex items-center justify-center py-12 w-full">
              <div className="loading-spinner sm" />
            </div>
          ) : !authUser ? (
            <>
              <div className="auth-heading flex flex-col gap-2">
                <h2 className="auth-title font-normal">Voter Registration</h2>
                <p className="auth-subtitle">Sign in to claim your voter ballot.</p>
              </div>
              <p className="text-sm font-normal text-secondary">You need to sign in with your Babcock student account before completing registration.</p>
              <ButtonLink href={PAGES.auth.login} variant="stamp" className="w-full">
                Go to Sign In
              </ButtonLink>
            </>
          ) : activeData ? (
            <>
              <div className="auth-heading flex flex-col gap-2">
                <h2 className="auth-title font-normal">{needsEmailConfirmation ? "Confirm voter details" : "Is this you?"}</h2>
                <p className="auth-subtitle">{needsEmailConfirmation ? "Verify that this is your student record." : "Confirm your student record to link your account."}</p>
              </div>
              <div className="reg-voter-card flex flex-col w-full gap-3">
                <div className="reg-voter-row flex items-center justify-between gap-4 w-full">
                  <span className="reg-voter-label font-normal shrink-0">Full name</span>
                  <span className="reg-voter-val font-semibold text-right">{activeData.fullName}</span>
                </div>
                <div className="reg-voter-row flex items-center justify-between gap-4 w-full">
                  <span className="reg-voter-label font-normal shrink-0">Matric number</span>
                  <span className="reg-voter-val font-medium text-right">{emailVoterData?.matricNumber ?? matricNumber.trim()}</span>
                </div>
                <div className="reg-voter-row flex items-center justify-between gap-4 w-full">
                  <span className="reg-voter-label font-normal shrink-0">Department</span>
                  <span className="reg-voter-val font-semibold text-right">{getDepartmentName(activeData.departmentId || "")}</span>
                </div>
                <div className="reg-voter-row flex items-center justify-between gap-4 w-full">
                  <span className="reg-voter-label font-normal shrink-0">Level</span>
                  <span className="reg-voter-val font-medium text-right">{activeData.level ? `${activeData.level} Level` : "—"}</span>
                </div>
              </div>
              {error && <p className="auth-error-msg">{error}</p>}
              <div className="reg-actions grid grid-cols-2 gap-3 w-full">
                <Button variant="secondary" onClick={handleGoBack} disabled={submitting} className="w-full">
                  Go back
                </Button>
                <Button variant="stamp" onClick={handleConfirm} disabled={submitting} className="w-full">
                  {submitting ? "Confirming..." : "Is this you?"}
                </Button>
              </div>
              <div className="reg-account-note flex justify-center w-full">
                <button type="button" onClick={handleSignOut} className="reg-signout-link hover:underline bg-transparent">
                  Signed in as <strong>{authUser.email}</strong>. Not you? Sign out.
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-heading flex flex-col gap-2">
                <h2 className="auth-title font-normal">Complete registration</h2>
                <p className="auth-subtitle">Verify your eligibility on the voter roll.</p>
              </div>
              <form noValidate onSubmit={handleLookupSubmit} className={clsx("t007-input-form flex flex-col w-full", error && "t007-input-global-error")}>
                <div className="flex flex-col w-full">
                  <label htmlFor="reg-fullName" className="auth-field-label font-semibold">
                    Full name
                  </label>
                  <Input id="reg-fullName" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => (setFullName(e.target.value), setError(""))} required />
                </div>
                <div className="flex flex-col w-full">
                  <label htmlFor="reg-matric" className="auth-field-label font-semibold">
                    Matric number
                  </label>
                  <Input id="reg-matric" type="text" placeholder="e.g. 21/0456 or PT/22/2222" value={matricNumber} onChange={(e) => (setMatricNumber(e.target.value), setError(""))} pattern={MATRIC_PATTERN} helperText={{ patternMismatch: "Matric number must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222)." }} required />
                </div>
                {error && <p className="auth-error-msg">{error}</p>}
                <Button type="submit" variant="stamp" disabled={submitting} className="w-full">
                  {submitting ? "Looking up..." : "Look me up"}
                </Button>
              </form>
              <div className="reg-account-note flex justify-center w-full">
                <button type="button" onClick={handleSignOut} className="reg-signout-link hover:underline bg-transparent">
                  Signed in as <strong>{authUser.email}</strong>. Not you? Sign out.
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer className="auth-footer" />
    </section>
  );
};

export default RegisterForm;
