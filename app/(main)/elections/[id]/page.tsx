"use client";
import React from "react";
import { useParams } from "next/navigation";
import ElectionPreview from "@/components/elections/preview/ElectionPreview";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ElectionPreview electionId={id} />;
}
