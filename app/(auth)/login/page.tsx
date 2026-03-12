"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_EMAIL_DOMAIN } from "@/lib/constants";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.endsWith(SCHOOL_EMAIL_DOMAIN)) {
      setError(`Please use your school email (${SCHOOL_EMAIL_DOMAIN})`);
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (snap.exists()) {
        router.replace("/");
      } else {
        router.replace("/register");
      }
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
      <h1 className="text-center font-serif text-2xl font-bold">
        Babcock Votes
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <input
            type="email"
            placeholder="Student Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm placeholder:text-muted-gray focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm placeholder:text-muted-gray focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        {error && (
          <p className="text-center text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-charcoal py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-gray">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-gold underline">
          Register
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
