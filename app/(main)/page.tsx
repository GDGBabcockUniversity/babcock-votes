"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { ElectionCard } from "@/components/election-card";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import type { Election } from "@/lib/types";

const HomePage = () => {
  const { signOut } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElections = async () => {
      const snap = await getDocs(
        query(collection(db, "elections"), orderBy("startDate", "desc"), limit(6)),
      );
      setElections(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Election),
      );
      setLoading(false);
    };
    fetchElections();
  }, []);

  const activeUpcoming = elections.filter(
    (e) => e.status === "active" || e.status === "upcoming",
  );

  const filtered = search
    ? activeUpcoming.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()),
      )
    : activeUpcoming;

  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="px-4 pb-8 pt-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-gray">
              <Sparkles className="size-3" />
              Official Platform
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-xs font-semibold text-red-600"
            >
              <ArrowRight className="size-3 rotate-180" />
              Sign Out
            </button>
          </div>

          <h1 className="mt-6 font-serif text-4xl font-bold leading-tight">
            Democracy,
            <br />
            <span className="italic text-gold">Elevated.</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-gray">
            Secure, transparent, and seamless elections for Babcock University
            departmental associations.
          </p>

          {/* Search */}
          <div className="relative mt-8">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-gray" />
            <input
              type="text"
              placeholder="Find your association..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm placeholder:text-muted-gray focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Active & Upcoming */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg italic">Active & Upcoming</h2>
            <Link
              href="/elections"
              className="flex items-center gap-1 text-xs font-medium text-muted-gray hover:text-charcoal"
            >
              See All <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-gray">
                No elections found.
              </p>
            ) : (
              filtered.map((e) => <ElectionCard key={e.id} election={e} />)
            )}
          </div>
        </div>
      </section>

      {/* Admin Footer */}
      <section className="bg-charcoal px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h3 className="font-serif text-lg italic text-white">
            Association Admin?
          </h3>
          <p className="mt-1 text-sm text-muted-gray">
            Access real-time analytics and manage candidate applications.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white px-4 py-2.5 text-xs font-semibold text-charcoal transition-colors hover:bg-white/90"
          >
            Go to Dashboard <ArrowRight className="size-3" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
