"use client";
import React from "react";
import Chip from "@/components/common/Chip";
import { ButtonLink } from "@/components/common/Button";
import ThumbprintIcon from "@icons/common/thumbprint-icon.svg";
import { formatFullDateTime } from "@/lib/date";
import { PAGES } from "@/lib/constants";
import type { Election } from "@/lib/types";
import "@/styles/ballot/success.css";

export interface BallotSuccessProps {
  election: Election;
  voterName?: string;
  votedAt?: number;
  receiptCode?: string | null;
}

export const BallotSuccess: React.FC<BallotSuccessProps> = ({ election, voterName = "Voter", votedAt, receiptCode = "BV26-RECORDED" }) => (
  <div className="ballot-success-container flex flex-col items-center w-full mx-auto text-center gap-6">
    <div className="ballot-success-stamp flex items-center justify-center shrink-0">
      <span className="flex items-center justify-center rotate-[14deg]">
        <ThumbprintIcon className="ballot-success-thumb" />
      </span>
    </div>
    <div>
      <Chip text="Vote recorded" tone="ok" />
    </div>
    <h1 className="ballot-success-title font-serif">Thanks for voting, {voterName.trim().split(" ")[0] || "Voter"}.</h1>
    <p className="ballot-success-desc font-normal">Your ballot has been counted. Results are announced after voting closes{election.endDate ? ` on ${formatFullDateTime(election.endDate)}` : ""}.</p>
    <div className="ballot-receipt-box flex flex-col w-full text-left">
      <div className="ballot-receipt-row flex items-center justify-between w-full">
        <span className="text-text-secondary font-normal">Election</span>
        <span className="font-semibold text-text-primary truncate ml-3">{election.title}</span>
      </div>
      <div className="ballot-receipt-row border-t border-border-default flex items-center justify-between w-full">
        <span className="text-text-secondary font-normal">Submitted</span>
        <span className="font-semibold text-text-primary">{votedAt ? formatFullDateTime(votedAt) : "Just now"}</span>
      </div>
      <div className="ballot-receipt-row border-t border-border-default flex items-center justify-between w-full">
        <span className="text-text-secondary font-normal">Receipt code</span>
        <span className="font-mono font-medium text-text-primary">{receiptCode || "BV26-CONFIRMED"}</span>
      </div>
      <p className="ballot-receipt-tip font-normal">Keep this code if you want to confirm later that your vote was counted.</p>
    </div>
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
      <ButtonLink href={PAGES.main.profile} variant="stamp" className="w-full sm:flex-1">
        Go to profile
      </ButtonLink>
      <ButtonLink href={PAGES.main.elections} variant="secondary" className="w-full sm:flex-1">
        Back to elections
      </ButtonLink>
    </div>
  </div>
);

export default BallotSuccess;
