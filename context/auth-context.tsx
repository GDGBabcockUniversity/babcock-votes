"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User } from "@/lib/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        setUserProfile(snap.exists() ? (snap.data() as User) : null);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
