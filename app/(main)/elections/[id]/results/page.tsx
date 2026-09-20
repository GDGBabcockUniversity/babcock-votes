"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PAGES } from "@/lib/constants";

// Public results are switched off: this only redirects to the election page.
// TODO: when public results should be a thing, add a public tallies query
// (`votes.tallies` is admin-only) and bring back the results view from git
// history (it tallied closed elections per candidate and per position).
const PublicResultsPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(PAGES.main.electionDetail(id));
  }, [id, router]);

  return (
    <div className="flex justify-center py-24">
      <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
};

export default PublicResultsPage;
