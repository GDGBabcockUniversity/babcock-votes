"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import { Bone, TableSkeleton } from "@/components/common/skeleton";
import CalendarIcon from "@icons/common/calendar.svg";
import BallotIcon from "@icons/common/ballot.svg";
import CheckIcon from "@icons/common/check.svg";
import UserIcon from "@icons/common/user.svg";
import "@/styles/admin/dashboard.css";
import "@/styles/common/Table.css";

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const statsData = useQuery(api.admin.dashboardStats);
  const electionsData = useQuery(api.elections.list, {});

  const elections = useMemo(() => (!electionsData ? [] : electionsData.slice(0, 10)), [electionsData]);
  const stats = useMemo(() => statsData ?? { totalElections: 0, activeElections: 0, totalVotes: 0, totalVotesCapped: false, totalUsers: 0, totalUsersCapped: false }, [statsData]);

  const statCards = [{ label: "Total elections", value: stats.totalElections.toLocaleString(), icon: <CalendarIcon className="w-full h-full" /> }, { label: "Open now", value: stats.activeElections.toLocaleString(), icon: <BallotIcon className="w-full h-full" /> }, ...(userProfile?.role === "super_admin" ? [{ label: "Votes cast", value: `${stats.totalVotes.toLocaleString()}${stats.totalVotesCapped ? "+" : ""}`, icon: <CheckIcon className="w-full h-full" /> }] : []), { label: "Registered voters", value: `${stats.totalUsers.toLocaleString()}${stats.totalUsersCapped ? "+" : ""}`, icon: <UserIcon className="w-full h-full" /> }];

  const loading = statsData === undefined || electionsData === undefined;

  return (
    <div className="admin-dashboard-page flex flex-col flex-1 w-full gap-6 lg:gap-8 mx-auto">
      <div className="admin-dashboard-header flex flex-col w-full gap-2">
        <h1 className="admin-dashboard-title font-normal">Dashboard</h1>
        <p className="admin-dashboard-subtitle font-normal">Every election across departments, at a glance.</p>
      </div>
      <div className={clsx("admin-stats-grid grid w-full gap-4", statCards.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
        {statCards.map((card) => (
          <div key={card.label} className="admin-stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between w-full">
              <span className="admin-stat-label font-medium">{card.label}</span>
              <span className="admin-stat-icon-wrap flex items-center justify-center shrink-0" aria-hidden="true">
                {card.icon}
              </span>
            </div>
            <span className="admin-stat-value font-normal">
              {loading ? <Bone className="w-16 h-8" /> : card.value}
            </span>
          </div>
        ))}
      </div>
      <div className="admin-section-header flex items-center justify-between w-full">
        <h2 className="admin-section-title font-normal">Elections</h2>
        <Link href={PAGES.admin.elections} className="admin-section-link font-semibold hover:underline">
          Manage elections
        </Link>
      </div>
      <div className="admin-table-card flex flex-col w-full overflow-hidden">
        <div className="admin-table-wrapper w-full overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th className="font-medium whitespace-nowrap">Election</th>
                <th className="font-medium whitespace-nowrap">Department</th>
                <th className="font-medium whitespace-nowrap">Status</th>
                <th className="font-medium whitespace-nowrap">Turnout</th>
                <th className="font-medium whitespace-nowrap">Closes</th>
              </tr>
            </thead>
            <tbody data-empty="No elections found">
              {loading ? (
                <TableSkeleton rows={4} widths={["w-48", "w-32", "w-20", "w-24", "w-24"]} />
              ) : (
                elections.map((election) => (
                  <tr key={election.id}>
                    <td className="font-medium">
                      <Link href={PAGES.admin.electionDetail(election.id)} className="admin-table-election-title no-underline hover:underline font-semibold block max-w-sm truncate" title={election.title}>
                        {election.title}
                      </Link>
                    </td>
                    <td className="admin-table-dept font-normal whitespace-nowrap">{getDepartmentName(election.departmentId)}</td>
                    <td className="whitespace-nowrap">
                      <Chip text={election.status === "active" ? "Open" : election.status === "upcoming" ? "Upcoming" : "Closed"} tone={election.status === "active" ? "ok" : election.status === "upcoming" ? "ink" : "neutral"} />
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="admin-turnout-track overflow-hidden shrink-0">
                          <div className="admin-turnout-fill" style={{ width: `${election.status === "closed" ? 100 : election.status === "active" ? 64 : 0}%` }} />
                        </div>
                        <span className="admin-turnout-pct font-medium">{election.status === "closed" ? 100 : election.status === "active" ? 64 : 0}%</span>
                      </div>
                    </td>
                    <td className="font-normal text-text-secondary whitespace-nowrap">{formatShortDate(election.endDate)}</td>
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

export default AdminDashboard;
