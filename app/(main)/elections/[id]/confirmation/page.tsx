"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check } from "lucide-react";
import type { Election } from "@/lib/types";
import { PAGES } from "@/lib/constants";

const ConfirmationPage = () => {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "elections", id));
      if (snap.exists()) {
        setElection({ id: snap.id, ...snap.data() } as Election);
      }
    };
    fetch();
  }, [id]);

  return (
    <div className="-mx-4 -mt-6 flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center bg-charcoal px-4 text-center">
      {/* Gold checkmark */}
      <div className="flex size-20 items-center justify-center rounded-full bg-gold">
        <Check className="size-10 text-white" strokeWidth={3} />
      </div>

      <h1 className="mt-6 font-serif text-3xl font-bold italic text-white">
        Ballot Secured
      </h1>

      <p className="mt-3 max-w-xs text-sm italic text-muted-gray">
        {election
          ? `Your vote for the ${election.title} has been encrypted and recorded.`
          : "Your vote has been encrypted and recorded."}
      </p>

      <div className="mt-10 w-full max-w-xs space-y-3">
        <Link
          href={PAGES.main.electionDetail(id)}
          className="block rounded-lg bg-white py-3.5 text-center text-sm font-semibold text-charcoal transition-opacity hover:opacity-90"
        >
          View Live Results
        </Link>
        <Link
          href={PAGES.main.home}
          className="block py-2 text-center text-xs text-muted-gray underline"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default ConfirmationPage;
