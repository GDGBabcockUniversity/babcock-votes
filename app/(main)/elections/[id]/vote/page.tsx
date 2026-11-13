"use client";
import React from "react";
import { useParams } from "next/navigation";
import Ballot from "@/components/ballot/Ballot";

export default function VotePage() {
  const { id } = useParams<{ id: string }>();
  return <Ballot electionId={id} />;
}
