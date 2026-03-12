"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  SCHOOL_EMAIL_DOMAIN,
  DEPARTMENTS,
  LEVELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RegisterPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.endsWith(SCHOOL_EMAIL_DOMAIN)) {
      setError(`Please use your school email (${SCHOOL_EMAIL_DOMAIN})`);
      return;
    }
    if (!sex) {
      setError("Please select your sex.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        fullName,
        matricNumber,
        sex,
        department,
        level,
        role: "voter",
        createdAt: serverTimestamp(),
      });

      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-border px-4 py-3 text-sm placeholder:text-muted-gray focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold font-sans";

  return (
    <div className="border border-border bg-white p-8 shadow-sm">
      <h1 className="text-center font-serif text-2xl md:text-3xl lg:text-4xl font-bold italic">
        Voter Profile Registration
      </h1>
      <p className="mt-1 text-center text-xs uppercase tracking-widest text-muted-gray">
        &mdash; {new Date().getFullYear()} Election Cycle &mdash;
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block lg:text-lg font-medium">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block lg:text-lg font-medium">
            Email Address
          </label>
          <input
            type="email"
            placeholder={`johndoe${SCHOOL_EMAIL_DOMAIN}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block lg:text-lg font-medium">Password</label>
          <input
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block lg:text-lg font-medium">
            Matric. Number
          </label>
          <input
            type="text"
            placeholder="e.g., 21/0456"
            value={matricNumber}
            onChange={(e) => setMatricNumber(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block lg:text-lg font-medium">Sex</label>
          <div className="grid grid-cols-2 gap-3">
            {(["male", "female"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSex(option)}
                className={cn('border py-2.5 text-sm font-medium font-sans capitalize transition-colors', sex === option
                  ? "border-gold bg-gold/10 text-charcoal"
                  : "border-border text-charcoal hover:border-gold/50"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block lg:text-lg font-medium">
              Department
            </label>
            <Select value={department} onValueChange={(v) => setDepartment(v ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block lg:text-lg font-medium">Level</label>
            <Select value={level} onValueChange={(v) => setLevel(v ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center font-sans justify-center gap-2 bg-gold py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Complete Registration & Vote"}
          {!loading && <span aria-hidden="true">&rsaquo;</span>}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
