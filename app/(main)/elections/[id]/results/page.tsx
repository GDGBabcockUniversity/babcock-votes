"use client";
import React from "react";
import { useParams } from "next/navigation";
import ElectionResults from "@/components/elections/results/ElectionResults";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ElectionResults electionId={id} />;
}
