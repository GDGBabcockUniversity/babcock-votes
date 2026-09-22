"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { VoterCodeSignIn } from "@/components/voter-code-sign-in";

type LoginMode = "student" | "part-time";

const LoginPage = () => {
  const {
    authUser,
    userProfile,
    loading,
    authError,
    signInWithGoogle,
    signInWithEmail,
  } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("student");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Part-time form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signed in but no profile yet: finish registration first. Navigating has
  // to happen in an effect, not while rendering.
  const needsRegistration = !loading && !!authUser && !userProfile;
  useEffect(() => {
    if (needsRegistration) router.replace(PAGES.auth.register);
  }, [needsRegistration, router]);

  if (needsRegistration) return null;

  const handleGoogleSignIn = async () => {
    setError("");
    setSigningIn(true);

    try {
      // Redirects to Google; the page navigates away, so the button stays busy.
      await signInWithGoogle();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.";
      setError(message);
      setSigningIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSigningIn(true);

    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: unknown) {
      // Convex Auth reports a bad email/password as a generic failure.
      console.error("[login] Email sign-in failed:", err);
      setError(
        "Invalid email or password. Please check your credentials and try again.",
      );
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="rounded-sm border border-border bg-card p-8 shadow-sm">
      <h1 className="text-center font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
        Babcock Votes
      </h1>
      <p className="mt-1 text-center text-xs uppercase tracking-widest text-muted-gray font-sans">
        &mdash; {new Date().getFullYear()} Election Cycle &mdash;
      </p>

      {/* Tab toggle */}
      <div className="mt-8 grid grid-cols-2 rounded-sm border border-border">
        <button
          type="button"
          onClick={() => {
            setMode("student");
            setError("");
          }}
          className={`py-2.5 text-xs rounded-sm font-sans font-semibold uppercase tracking-wider transition-colors ${
            mode === "student"
              ? "bg-foreground text-background"
              : "bg-card text-muted-gray hover:text-foreground"
          }`}
        >
          Student
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("part-time");
            setError("");
          }}
          className={`py-2.5 text-xs font-sans font-semibold uppercase tracking-wider transition-colors ${
            mode === "part-time"
              ? "bg-foreground text-background"
              : "bg-card text-muted-gray hover:text-foreground"
          }`}
        >
          Part-Time
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {mode === "student" && (
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="flex w-full items-center font-sans justify-center gap-3 rounded-sm bg-foreground py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {signingIn ? (
              "Signing in..."
            ) : (
              <>
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        )}

        {mode === "student" && (
          <div className="flex items-center gap-3 font-sans text-xs uppercase tracking-wider text-muted-gray">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Matric number -> a 6-digit code emailed to the student. */}
        {mode === "student" && <VoterCodeSignIn />}

        {mode === "part-time" && (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="pt-email"
                className="mb-2 block text-sm font-medium font-sans"
              >
                Email
              </label>
              <Input
                id="pt-email"
                type="email"
                placeholder="e.g., pt-22-2222@parttime.babcockvotes.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="pt-password"
                className="mb-2 block text-sm font-medium font-sans"
              >
                Password
              </label>
              <Input
                id="pt-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={signingIn}
              className="flex w-full items-center font-sans justify-center gap-2 rounded-sm bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {signingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {(error || authError) && (
          <p className="text-center text-xs text-red-600 dark:text-red-400">
            {error || authError}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
