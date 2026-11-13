"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";
import { errorMessage } from "@/lib/errors";
import { ButtonLink } from "@/components/common/Button";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import { TableSkeleton } from "@/components/common/skeleton";
import { Actions, Action, ActionLink } from "@/components/common/Actions";
import { confirm } from "@t007/dialog";
import toast from "@/lib/toast";
import "@/styles/common/Table.css";
import "@/styles/admin/elections.css";

export const AdminElections: React.FC = () => {
  const { authUser, userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";
  const departmentId = userProfile?.departmentId;
  const electionsData = useQuery(api.elections.list, { orderBy: "createdAt" });
  const duplicateElection = useMutation(api.elections.duplicate);
  const removeElection = useMutation(api.elections.remove);

  const elections = useMemo(() => (!electionsData ? [] : electionsData.filter((e) => isSuperAdmin || !departmentId || e.departmentId === departmentId)), [electionsData, isSuperAdmin, departmentId]);

  const handleDuplicate = async (id: string) => {
    if (!authUser || !isSuperAdmin) return;
    try {
      await duplicateElection({ id: id as Id<"elections"> });
      toast.success("Election duplicated successfully.");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to duplicate election."));
    }
  };
  const handleDelete = async (id: string, title: string) => {
    if (!authUser || !isSuperAdmin || !(await confirm(`Delete "${title}"? This cannot be undone.`))) return;
    try {
      await removeElection({ id: id as Id<"elections"> });
      toast.success(`"${title}" deleted successfully.`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete election."));
    }
  };

  const loading = electionsData === undefined;

  return (
    <div className="admin-elections-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto">
      <div className="admin-elections-header flex items-start justify-between w-full max-md:flex-col max-md:items-start gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="admin-elections-title font-normal">Elections</h1>
          <p className="admin-elections-subtitle font-normal">Create elections and manage their candidates.</p>
        </div>
        {isSuperAdmin && (
          <ButtonLink href={PAGES.admin.newElection} variant="stamp" className="admin-elections-create-btn shrink-0">
            Create election
          </ButtonLink>
        )}
      </div>
      <div className="admin-elections-table-card flex flex-col w-full overflow-hidden">
        <div className="admin-table-wrapper w-full overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th className="font-medium whitespace-nowrap">Title</th>
                <th className="font-medium whitespace-nowrap">Department</th>
                <th className="font-medium whitespace-nowrap">Status</th>
                <th className="font-medium whitespace-nowrap">Start date</th>
                <th className="font-medium whitespace-nowrap">End date</th>
                <th className="font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody data-empty="No elections found">
              {loading ? (
                <TableSkeleton rows={5} widths={["w-48", "w-32", "w-20", "w-24", "w-24", "w-8"]} />
              ) : (
                elections.map((election) => (
                  <tr key={election.id}>
                    <td className="font-medium whitespace-nowrap">
                      <Link href={PAGES.admin.electionDetail(election.id)} className="admin-table-election-title no-underline hover:underline font-semibold">
                        {election.title}
                      </Link>
                    </td>
                    <td className="admin-table-dept font-normal whitespace-nowrap">{getDepartmentName(election.departmentId)}</td>
                    <td className="whitespace-nowrap">
                      <Chip text={election.status.charAt(0).toUpperCase() + election.status.slice(1)} tone={election.status === "active" ? "ok" : election.status === "upcoming" ? "ink" : "neutral"} />
                    </td>
                    <td className="font-normal text-text-secondary whitespace-nowrap">{formatShortDate(election.startDate)}</td>
                    <td className="font-normal text-text-secondary whitespace-nowrap">{formatShortDate(election.endDate)}</td>
                    <td className="whitespace-nowrap">
                      <Actions position="bottom-left">
                        <ActionLink href={PAGES.admin.electionDetail(election.id)}>Edit & Candidates</ActionLink>
                        <ActionLink href={PAGES.admin.electionResults(election.id)}>View Results</ActionLink>
                        {isSuperAdmin && <Action onClick={() => handleDuplicate(election.id)}>Duplicate</Action>}
                        {isSuperAdmin && <Action danger onClick={() => handleDelete(election.id, election.title)}>Delete</Action>}
                      </Actions>
                    </td>
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

export default AdminElections;
