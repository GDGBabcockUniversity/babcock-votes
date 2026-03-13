"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_EMAIL_DOMAIN } from "@/lib/constants";
import { Input } from "@/components/ui/input";

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
    <div className="border border-border bg-white p-8 shadow-sm">
      <h1 className="text-center font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
        Babcock Votes
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <Input
            type="email"
            placeholder="Student Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-center text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-charcoal py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 font-sans"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>

      {/* <p className="mt-6 text-center text-xs text-muted-gray">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-gold underline">
          Register
        </Link>
      </p> */}
    </div>
  );
};

export default LoginPage;
