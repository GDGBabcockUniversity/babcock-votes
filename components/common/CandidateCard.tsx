"use client";
import React, { useRef } from "react";
import clsx from "clsx";
import Avatar from "./Avatar";
import { getDepartmentName } from "@/lib/utils";
import ThumbprintIcon from "@icons/common/thumbprint-icon.svg";
import { rippleHandler } from "@t007/utils/hooks/vanilla";
import { useScrollAssist } from "@t007/utils/hooks/react";
import "@/styles/common/CandidateCard.css";

export interface CandidateCardData {
  id?: string;
  _id?: string;
  fullName: string;
  photoUrl?: string | null;
  pitch?: string;
  manifesto?: string;
  department?: string;
  departmentId?: string;
  departmentName?: string;
  level?: string | number;
}

export interface CandidateCardProps {
  candidate: CandidateCardData;
  selected?: boolean;
  onSelect?: () => void;
  size?: "regular" | "compact";
  interactive?: boolean;
  showStamp?: boolean;
  className?: string;
}

const CandidateName: React.FC<{ name: string; isCompact?: boolean }> = ({ name, isCompact }) => {
  const nameRef = useRef<HTMLHeadingElement>(null);
  useScrollAssist(nameRef as React.RefObject<HTMLElement>, { enabled: true, assistClassName: "scroll-assist" });

  return (
    <div className="candidate-name-slot relative flex-1 min-w-0">
      <h3 ref={nameRef} tabIndex={-1} className={clsx("candidate-name font-serif whitespace-nowrap", isCompact && "compact")}>
        {name}
      </h3>
    </div>
  );
};

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, selected = false, onSelect, size = "regular", interactive = Boolean(onSelect), showStamp = interactive || selected, className }) => {
  const isCompact = size === "compact";
  const subtitle = [candidate.departmentName || candidate.department || (candidate.departmentId ? getDepartmentName(candidate.departmentId) : ""), candidate.level ? `${candidate.level} Level` : ""].filter(Boolean).join(", ");
  const pitchDisplay = candidate.pitch || candidate.manifesto || "";

  return (
    <div role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined} onClick={interactive ? onSelect : undefined} onKeyDown={interactive ? (e) => onSelect && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect()) : undefined} onPointerDown={interactive ? (e) => rippleHandler(e, { target: e.currentTarget }) : undefined} aria-pressed={interactive ? selected : undefined} className={clsx("candidate-card relative overflow-hidden select-none transition-all", selected ? "selected" : "default", interactive && "cursor-pointer", isCompact ? "compact flex flex-col gap-3" : "flex items-start sm:items-center gap-4", className)}>
      {isCompact ? (
        <>
          <div className="candidate-card-top flex items-center w-full gap-3">
            <Avatar src={candidate.photoUrl} name={candidate.fullName} size="lg" radius="sm" className="candidate-avatar compact shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <CandidateName name={candidate.fullName} isCompact />
              {subtitle && <p className="candidate-dept font-sans">{subtitle}</p>}
            </div>
            {showStamp && (
              <div className={clsx("candidate-stamp compact shrink-0 relative flex items-center justify-center", selected ? "selected" : "unselected")}>
                {selected && (
                  <span className="candidate-stamp-icon flex items-center justify-center rotate-[12deg]">
                    <ThumbprintIcon className="w-full h-full" />
                  </span>
                )}
              </div>
            )}
          </div>
          {pitchDisplay && <p className="candidate-pitch font-sans line-clamp-2 w-full">{pitchDisplay}</p>}
        </>
      ) : (
        <>
          <Avatar src={candidate.photoUrl} name={candidate.fullName} size="xl" radius="sm" className="candidate-avatar regular shrink-0" />
          <div className="flex-1 flex flex-col min-w-0">
            <CandidateName name={candidate.fullName} />
            {subtitle && <p className="candidate-dept font-sans">{subtitle}</p>}
            {pitchDisplay && <p className="candidate-pitch font-sans line-clamp-2 w-full mt-1.5">{pitchDisplay}</p>}
          </div>
          {showStamp && (
            <div className={clsx("candidate-stamp regular shrink-0 relative flex items-center justify-center", selected ? "selected" : "unselected")}>
              {selected && (
                <span className="candidate-stamp-icon flex items-center justify-center rotate-[12deg]">
                  <ThumbprintIcon className="w-full h-full" />
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CandidateCard;
