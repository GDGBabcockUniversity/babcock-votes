"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatShortDate } from "@/lib/date";
import { useAuth } from "@/context/auth-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import type { Election } from "@/lib/types";
import { getDepartmentName } from "@/lib/utils";
import { PAGES } from "@/lib/constants";

const statusOrder: Record<Election["status"], number> = {
  active: 0,
  upcoming: 1,
  closed: 2,
};

/** Viewers land here: their department's elections, live ones first. */
const LiveResultsPage = () => {
  const { userProfile } = useAuth();
  const departmentId = userProfile?.departmentId;

  const electionsData = useQuery(api.elections.list, {});
  const loading = electionsData === undefined;
  const elections: Election[] = useMemo(
    () =>
      (electionsData ?? [])
        .filter((e) => !e.isDuplicate && e.departmentId === departmentId)
        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]),
    [electionsData, departmentId],
  );

  return (
    <div>
      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
        Live Results
      </h1>
      <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-gray font-sans">
        Elections for {getDepartmentName(departmentId || "")}.
      </p>

      <div className="mt-6 rounded-sm border border-border">
        <Table className="font-sans">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Candidates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center">
                  <div className="mx-auto size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                </TableCell>
              </TableRow>
            ) : elections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-muted-gray"
                >
                  No elections for your department yet.
                </TableCell>
              </TableRow>
            ) : (
              elections.map((el) => (
                <TableRow key={el.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={PAGES.admin.electionResults(el.id)}
                      className="font-medium hover:underline"
                    >
                      {el.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={el.status} />
                  </TableCell>
                  <TableCell className="text-muted-gray">
                    {el.startDate ? formatShortDate(el.startDate) : "—"}
                  </TableCell>
                  <TableCell>{el.candidateCount ?? 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LiveResultsPage;
