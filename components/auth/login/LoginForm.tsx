"use client";
import React, { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Input, useFormManager } from "@t007/input/react";
import GoogleIcon from "@icons/common/google.svg";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/common/Button";
import { CodeSignIn } from "@/components/auth/CodeSignIn";
import Footer from "@/components/common/Footer";

type LoginMode = "student" | "part-time";

const LoginForm: React.FC = () => {
  const { authError, signInWithGoogle, signInWithEmail } = useAuth();
  const [mode, setMode] = useState<LoginMode>("student");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleSignIn = async () => {
    (setError(""), setSigningIn(true));
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      (setError(err instanceof Error ? err.message : "Sign-in failed. Please try again."), setSigningIn(false));
    }
  };
  const handleEmailSignIn = async () => {
    (setError(""), setSigningIn(true));
    try {
      await signInWithEmail(email.trim(), password);
    } catch {
      setError("Invalid email or password. Please check your credentials and try again.");
    } finally {
      setSigningIn(false);
    }
  };
  const { handleSubmit: handleEmailSubmit } = useFormManager(handleEmailSignIn);

  return (
    <section className="auth-form-panel flex flex-1 flex-col justify-between min-h-dvh">
      <header className="auth-topbar flex justify-end w-full">
        <ThemeToggle />
      </header>
      <div className="auth-form-center flex flex-auto flex-col items-center justify-center">
        <div className="auth-form-box flex flex-col w-full gap-5">
          <div className="auth-heading flex flex-col gap-2">
            <h2 className="auth-title font-normal">Sign in to vote</h2>
            <p className="auth-subtitle">Use your Babcock student account.</p>
          </div>
          <div className="auth-tabs flex w-full gap-1" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "student"} onClick={() => (setMode("student"), setError(""))} className={`auth-tab flex-1 text-center font-semibold ${mode === "student" ? "active" : ""}`}>
              Full-time
            </button>
            <button type="button" role="tab" aria-selected={mode === "part-time"} onClick={() => (setMode("part-time"), setError(""))} className={`auth-tab flex-1 text-center font-semibold ${mode === "part-time" ? "active" : ""}`}>
              Part-time
            </button>
          </div>
          {mode === "student" && (
            <>
              <Button variant="primary" onClick={handleGoogleSignIn} disabled={signingIn} className="w-full">
                <GoogleIcon aria-hidden />
                <span>{signingIn ? "Signing in..." : "Continue with Google"}</span>
              </Button>
              <div className="auth-divider flex items-center w-full gap-3">
                <span className="auth-divider-line flex-1" />
                <span className="auth-divider-text whitespace-nowrap">or use your matric number</span>
                <span className="auth-divider-line flex-1" />
              </div>
              <CodeSignIn authError={error || authError} />
            </>
          )}
          {mode === "part-time" && (
            <form noValidate onSubmit={handleEmailSubmit} className={clsx("t007-input-form flex flex-col w-full", (error || authError) && "t007-input-global-error")}>
              <div className="flex flex-col w-full">
                <label htmlFor="pt-email" className="auth-field-label font-semibold">
                  Email
                </label>
                <Input id="pt-email" type="email" placeholder="e.g. pt-22-2222@parttime.babcockvotes.com" value={email} onChange={(e) => (setEmail(e.target.value), setError(""))} required />
              </div>
              <div className="flex flex-col w-full">
                <label htmlFor="pt-password" className="auth-field-label font-semibold">
                  Password
                </label>
                <Input id="pt-password" type="password" placeholder="Enter your password" value={password} minLength={8} autoComplete="current-password" passwordMeter={false} onChange={(e) => (setPassword(e.target.value), setError(""))} required />
              </div>
              <div className="auth-forgot flex justify-end w-full">
                <Link href="#" className="auth-forgot-link font-semibold hover:underline bg-transparent">
                  Forgot password?
                </Link>
              </div>
              {(authError || error) && <p className="auth-error-msg">{authError || error}</p>}
              <Button type="submit" variant="stamp" disabled={signingIn} className="w-full">
                {signingIn ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}
          <p className="auth-help-note">Trouble signing in? Contact the electoral committee at the SRC office.</p>
        </div>
      </div>
      <Footer className="auth-footer" />
    </section>
  );
};

export default LoginForm;
