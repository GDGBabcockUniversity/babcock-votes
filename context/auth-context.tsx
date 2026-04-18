"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { SCHOOL_DOMAIN } from "@/lib/constants";
import type { User } from "@/lib/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref (not state) so the flag is visible immediately inside the
  // onAuthStateChanged callback — no stale-closure issues.
  const signingInRef = useRef(false);

  const loadProfile = useCallback(async (user: FirebaseUser) => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      setUserProfile(snap.exists() ? (snap.data() as User) : null);
    } catch (err) {
      console.error("[auth-context] Failed to read user profile:", err);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user && !signingInRef.current) {
        // Only load profile here for cached sessions (page reload).
        // Fresh sign-ins are handled by signInWithGoogle / signInWithEmail.
        setLoading(true);
        await loadProfile(user);
        setLoading(false);
      } else if (!user) {
        setUserProfile(null);
        setLoading(false);
      }
      // When signingInRef.current is true, DON'T set loading = false here.
      // The sign-in function will set it after loading the profile.
    });

    return unsubscribe;
  }, [loadProfile]);

  const signInWithGoogle = async () => {
    signingInRef.current = true;
    try {
      googleProvider.setCustomParameters({
        prompt: "select_account",
        hd: SCHOOL_DOMAIN,
      });
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email ?? "";

      if (!email.endsWith(`@${SCHOOL_DOMAIN}`)) {
        await firebaseSignOut(auth);
        setFirebaseUser(null);
        setUserProfile(null);
        throw new Error(
          `Only @${SCHOOL_DOMAIN} email addresses are allowed. Please sign in with your school email.`,
        );
      }

      // Token is fully established after signInWithPopup resolves.
      // Safe to read Firestore now.
      setFirebaseUser(result.user);
      await loadProfile(result.user);
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    signingInRef.current = true;
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const result = await signInWithEmailAndPassword(auth, email, password);

      setFirebaseUser(result.user);
      await loadProfile(result.user);
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    const snap = await getDoc(doc(db, "users", firebaseUser.uid));
    setUserProfile(snap.exists() ? (snap.data() as User) : null);
  }, [firebaseUser]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
