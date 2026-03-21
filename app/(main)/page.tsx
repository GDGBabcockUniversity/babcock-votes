"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { ElectionCard } from "@/components/election-card";
import { ElectionCardSkeleton } from "@/components/skeleton-loader";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import type { Election } from "@/lib/types";
import { PAGES } from "@/lib/constants";

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
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full font-sans border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-gray">
              <Sparkles className="size-3 text-gold" />
              Official Platform
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 font-sans bg-red-100 py-1.5 px-3 rounded-full"
            >
              <ArrowRight className="size-3 rotate-180" />
              Sign Out
            </button>
          </div>

          <h1 className="mt-6 font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Democracy,
            <br />
            <span className="italic text-gold font-normal">Elevated.</span>
          </h1>

          <p className="mt-3 text-sm md:text-base lg:text-lg leading-relaxed text-muted-gray font-sans">
            Secure, transparent, and seamless elections for Babcock University
            departmental associations.
          </p>

          {/* Search */}
          <div className="relative mt-8">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-gray" />
            <Input
              type="text"
              placeholder="Find your association..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Active & Upcoming */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg md:text-xl lg:text-2xl font-bold">Active & Upcoming</h2>
            <Link
              href={PAGES.main.elections}
              className="flex items-center gap-1 text-xs font-sans md:text-sm lg:text-base font-medium text-muted-gray hover:text-charcoal"
            >
              See All <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <ElectionCardSkeleton />
                <ElectionCardSkeleton />
                <ElectionCardSkeleton />
              </>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-gray font-sans">
                No elections found.
              </p>
            ) : (
              filtered.map((e) => <ElectionCard key={e.id} election={e} />)
            )}
          </div>
        </div>
      </section>

      {/* Admin Footer */}
      <section className="bg-charcoal px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <h3 className="font-serif text-lg md:text-xl lg:text-2xl font-bold italic text-white">
            Association Admin?
          </h3>
          <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-gray font-sans">
            Access real-time analytics and manage candidate applications.
          </p>
          <Link
            href={PAGES.admin.dashboard}
            className="mt-4 inline-flex items-center font-sans gap-2 rounded-lg border border-white/20 bg-white px-4 py-2.5 text-xs font-semibold text-charcoal transition-colors hover:bg-white/90"
          >
            Go to Dashboard <ArrowRight className="size-3" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
