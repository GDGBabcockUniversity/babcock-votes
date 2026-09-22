"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PAGES, SCHOOL_DOMAIN } from "@/lib/constants";
import { matricToDocId } from "@/lib/matric";
import type { User } from "@/lib/types";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  authUser: AuthUser | null;
  userProfile: User | null;
  loading: boolean;
  /** Set when a sign-in failed or was rejected. */
  authError: string;
  /** Redirects to Google; the page reloads on return, so this never resolves in practice. */
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Email a 6-digit sign-in code to the registered student with this matric. */
  sendVoterCode: (matric: string) => Promise<void>;
  /** Sign in with the emailed code. */
  verifyVoterCode: (matric: string, code: string) => Promise<void>;
  /** Kept for callers; the profile query is live so it updates by itself. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  authUser: null,
  userProfile: null,
  loading: true,
  authError: "",
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  sendVoterCode: async () => {},
  verifyVoterCode: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut: convexSignOut } = useAuthActions()
  const me = useQuery(api.users.me);

  const [authError, setAuthError] = useState("");

  const authUser = me?.authUser ?? null;
  const userProfile = me?.profile ?? null;

  // Anyone without a profile who isn't on the school domain is turned away
  // (the server also refuses to create such accounts; this covers old sessions).
  const rejected =
    !!authUser && !userProfile && !authUser.email.endsWith(`@${SCHOOL_DOMAIN}`);

  useEffect(() => {
    if (!rejected) return;
    // Sign out first; the message is set once that resolves.
    void convexSignOut().then(() =>
      setAuthError(
        `Only @${SCHOOL_DOMAIN} email addresses are allowed. Please sign in with your school email.`,
      ),
    );
  }, [rejected, convexSignOut]);

  const signInWithGoogle = async () => {
    setAuthError("");
    await signIn("google", { redirectTo: PAGES.auth.login });
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError("");
    const result = await signIn("password", { email, password, flow: "signIn" });
    // A wrong password can resolve without signing in; make it an error.
    if (!result.signingIn) throw new Error("Invalid credentials");
  };

  // The identifier is the matric key; the server looks up where to send the code.
  const sendVoterCode = async (matric: string) => {
    setAuthError("");
    await signIn("voter-otp", { email: matricToDocId(matric.trim()) });
  };

  const verifyVoterCode = async (matric: string, code: string) => {
    setAuthError("");
    const result = await signIn("voter-otp", { email: matricToDocId(matric.trim()), code });
    if (!result.signingIn) throw new Error("Invalid code");
  };

  const signOut = async () => {
    await convexSignOut();
  };

  return (
    <AuthContext.Provider
      value={{
        authUser: rejected ? null : authUser,
        userProfile,
        // Still resolving the session, or signed in but the profile query hasn't answered yet.
        loading: isLoading || (isAuthenticated && me === undefined),
        authError,
        signInWithGoogle,
        signInWithEmail,
        sendVoterCode,
        verifyVoterCode,
        refreshProfile: async () => {},
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
