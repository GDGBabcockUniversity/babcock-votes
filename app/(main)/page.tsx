"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ElectionCard } from "@/components/election-card";
import { ElectionCardSkeleton } from "@/components/skeleton-loader";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import type { Election } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const HomePage = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElections = async () => {
      const snap = await getDocs(
        query(
          collection(db, "elections"),
          orderBy("startDate", "desc"),
          limit(6),
        ),
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
      <section className="px-4 pb-10 pt-8 md:pb-14 md:pt-12">
        <div className="mx-auto max-w-5xl">
          {/* <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-wider text-muted-gray">
            <Sparkles className="size-3 text-gold" />
            Official Platform
          </span> */}

          <h1 className="mt-6 font-serif text-4xl font-bold leading-tight md:mt-8 md:text-5xl lg:text-6xl">
            Democracy,
            <br />
            <span className="font-normal italic text-gold">Elevated.</span>
          </h1>

          <p className="mt-3 max-w-lg font-sans text-sm leading-relaxed text-muted-gray md:mt-4 md:text-base lg:text-lg">
            Secure, transparent, and seamless elections for Babcock University
            departmental associations.
          </p>

          {/* Search */}
          <div className="relative mt-8 max-w-md">
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
      <section className="px-4 py-6 md:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold md:text-xl lg:text-2xl">
              Active & Upcoming
            </h2>
            <Link
              href={PAGES.main.elections}
              className="flex items-center gap-1 font-sans text-xs font-medium text-muted-gray hover:text-charcoal md:text-sm"
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
              <p className="col-span-full py-12 text-center font-sans text-sm text-muted-gray">
                No elections found.
              </p>
            ) : (
              filtered.map((e) => <ElectionCard key={e.id} election={e} />)
            )}
          </div>
        </div>
      </section>

      {/* Admin Footer */}
      <section className="bg-charcoal px-4 py-8 md:py-10 lg:py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="font-serif text-lg font-bold italic text-white md:text-xl lg:text-2xl">
            Association Admin?
          </h3>
          <p className="mt-1 font-sans text-sm text-muted-gray md:text-base">
            Access real-time analytics and manage candidate applications.
          </p>
          <Link
            href={PAGES.admin.dashboard}
            className="mt-4 inline-flex items-center gap-2 border border-white/20 bg-white px-4 py-2.5 font-sans text-xs font-semibold text-charcoal transition-colors hover:bg-white/90"
          >
            Go to Dashboard <ArrowRight className="size-3" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
