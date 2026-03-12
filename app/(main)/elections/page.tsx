"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ElectionCard } from "@/components/election-card";
import { Search } from "lucide-react";
import type { Election } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | Election["status"];

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Closed", value: "closed" },
];

const ElectionsPage = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(
        query(collection(db, "elections"), orderBy("startDate", "desc")),
      );
      setElections(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Election),
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = elections.filter((e) => {
    const matchesFilter = filter === "all" || e.status === filter;
    const matchesSearch = e.title
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold italic">Elections</h1>
      <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-gray font-sans">
        Browse all association democratic processes.
      </p>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-gray" />
        <input
          type="text"
          placeholder="Search by association..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full font-sans border border-border bg-white py-3 pl-10 pr-4 text-sm placeholder:text-muted-gray focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {/* Filter pills */}
      <div className="mt-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn('rounded-full font-sans px-4 py-1.5 text-xs font-medium transition-colors', filter === f.value
              ? "bg-charcoal text-white"
              : "border border-border text-charcoal hover:bg-secondary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-gray font-sans">
            No elections match your criteria.
          </p>
        ) : (
          filtered.map((e) => <ElectionCard key={e.id} election={e} />)
        )}
      </div>
    </div>
  );
};

export default ElectionsPage;
