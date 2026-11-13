"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";
import type { Election } from "@/lib/types";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import { TableSkeleton } from "@/components/common/skeleton";
import "@/styles/common/Table.css";
import "@/styles/admin/live-results.css";

const statusOrder: Record<Election["status"], number> = {
  active: 0,
  upcoming: 1,
  closed: 2,
};

export const AdminLiveResults: React.FC = () => {
  const { userProfile } = useAuth();
  const departmentId = userProfile?.departmentId;
  const electionsData = useQuery(api.elections.list, {});

  const elections: Election[] = useMemo(
    () =>
      (electionsData ?? [])
        .filter((e) => !e.isDuplicate && e.departmentId === departmentId)
        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]),
    [electionsData, departmentId],
  );

  const loading = electionsData === undefined;

  return (
    <div className="admin-live-results-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto">
      <div className="admin-live-results-header flex flex-col w-full gap-2">
        <h1 className="admin-live-results-title font-normal">Live Results</h1>
        <p className="admin-live-results-subtitle font-normal">
          Elections for {getDepartmentName(departmentId || "")}.
        </p>
      </div>
      <div className="admin-live-results-table-card flex flex-col w-full overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th className="font-medium whitespace-nowrap">Title</th>
                <th className="font-medium whitespace-nowrap">Status</th>
                <th className="font-medium whitespace-nowrap">Start Date</th>
                <th className="font-medium whitespace-nowrap">Candidates</th>
              </tr>
            </thead>
            <tbody data-empty="No elections for your department yet.">
              {loading ? (
                <TableSkeleton rows={4} widths={["w-48", "w-20", "w-28", "w-12"]} />
              ) : (
                elections.map((el) => (
                  <tr key={el.id}>
                    <td className="font-medium whitespace-nowrap">
                      <Link href={PAGES.admin.electionResults(el.id)} className="admin-table-election-title no-underline hover:underline font-semibold">
                        {el.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">
                      <Chip text={el.status.charAt(0).toUpperCase() + el.status.slice(1)} tone={el.status === "active" ? "ok" : el.status === "upcoming" ? "ink" : "neutral"} />
                    </td>
                    <td className="font-normal text-text-secondary whitespace-nowrap">{el.startDate ? formatShortDate(el.startDate) : "—"}</td>
                    <td className="font-normal text-text-secondary whitespace-nowrap">{el.candidateCount ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer className="admin-footer" />
    </div>
  );
};

export default AdminLiveResults;
