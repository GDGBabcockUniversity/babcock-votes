import Image from "next/image";
import type { Candidate } from "@/lib/types";

export const CandidateCard = ({ candidate }: { candidate: Candidate }) => (
  <div className="overflow-hidden border border-border bg-white font-sans">
    <div className="relative aspect-4/5 w-full bg-muted">
      {candidate.photoUrl ? (
        <Image
          src={candidate.photoUrl}
          alt={candidate.fullName}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center text-2xl font-bold text-muted-gray">
          {candidate.fullName.charAt(0)}
        </div>
      )}
    </div>
    <div className="p-3">
      <p className="font-sans md:text-lg font-semibold leading-tight">
        {candidate.fullName}
      </p>
      {candidate.manifesto && (
        <p className="mt-1 line-clamp-2 text-xs md:text-sm text-muted-gray">
          {candidate.manifesto}
        </p>
      )}
    </div>
  </div>
);
