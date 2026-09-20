"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { Check } from "lucide-react";
import type { Election } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const ConfirmationPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authUser, loading: authLoading } = useAuth();
  const voted = useQuery(api.votes.hasVoted, { electionId: id });
  const detail = useQuery(api.elections.detail, { id });
  const election: Election | null = detail?.election ?? null;

  useEffect(() => {
    if (authLoading) return;

    // Only someone who actually voted gets to see the confirmation.
    if (!authUser || voted === false) {
      router.replace(PAGES.main.electionDetail(id));
    }
  }, [id, authUser, authLoading, voted, router]);

  const verified = voted === true;

  if (!verified) {
    return (
      <div className="-mx-4 -mt-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-charcoal">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-6 flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center bg-charcoal px-4 text-center">
      {/* Gold checkmark */}
      <div className="flex size-20 items-center justify-center rounded-full bg-gold">
        <Check className="size-10 text-white" strokeWidth={3} />
      </div>

      <h1 className="mt-6 font-serif text-3xl font-bold text-white">
        Ballot Secured
      </h1>

      <p className="mt-3 max-w-xs text-sm text-charcoal-muted font-sans">
        {election
          ? `Your vote for the ${election.title} has been encrypted and recorded.`
          : "Your vote has been encrypted and recorded."}
      </p>

      <div className="mt-10 w-full max-w-xs space-y-3 font-sans">
        <Link
          href={PAGES.main.home}
          className="block rounded-sm bg-white py-3.5 text-center text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
        >
          Return Home
        </Link>
      </div>

      <div className="mt-8 font-sans">
        <p className="text-xs text-charcoal-muted">How was your experience?</p>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLScO0fmvY1qrWgOcLiNq05XV3QSUzS4yGsnqfasq5JiAj7OqBw/viewform?usp=dialog"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-medium text-gold underline underline-offset-2 hover:text-gold/80"
        >
          Share your feedback
        </a>
      </div>
    </div>
  );
};

export default ConfirmationPage;
