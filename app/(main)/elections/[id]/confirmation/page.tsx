"use client";
import React from "react";
import { useParams } from "next/navigation";
import BallotConfirmation from "@/components/ballot/confirmation/BallotConfirmation";

export default function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  return <BallotConfirmation electionId={id} />;
}
