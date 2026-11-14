"use client";
import React, { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { User } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { getDepartmentName } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { HighlightText } from "@t007/utils/components/react";
import Footer from "@/components/common/Footer";
import { TableSkeleton } from "@/components/common/skeleton";
import toast from "@/lib/toast";
import SearchIcon from "@icons/common/search.svg";
import "@/styles/common/Table.css";
import "@/styles/admin/users.css";

const PAGE_SIZE = 20;
const ROLES = [
  { value: "voter", label: "Voter" },
  { value: "viewer", label: "Results viewer" },
  { value: "dept_admin", label: "Department admin" },
  { value: "super_admin", label: "Super admin" },
] as const;

export const AdminUsers: React.FC = () => {
  const { authUser, userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";
  const usersData = useQuery(api.users.list);
  const setRole = useMutation(api.users.setRole);

  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const users: (User & { uid: string })[] = useMemo(() => (usersData ?? []) as (User & { uid: string })[], [usersData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.matricNumber?.toLowerCase().includes(q));
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const loading = usersData === undefined;

  const handleRoleChange = async (uid: string, nextRole: User["role"]) => {
    if (!isSuperAdmin && uid !== authUser?.id) return;
    setUpdatingId(uid);
    try {
      await setRole({ userId: uid as Id<"users">, role: nextRole });
      toast.success("User role updated successfully.");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update user role."));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-users-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto">
      <div className="admin-users-header flex flex-col w-full gap-2">
        <h1 className="admin-users-title font-normal">Users</h1>
        <p className="admin-users-subtitle font-normal">Everyone registered on Babcock Votes, and what they can do.</p>
      </div>
      <div className="search-bar flex items-center w-full max-w-sm gap-2.5">
        <span className="search-bar-icon flex items-center justify-center shrink-0" aria-hidden="true">
          <SearchIcon className="size-4" />
        </span>
        <input type="text" placeholder="Search by name, email or matric number" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} className="search-bar-input flex-1 min-w-0" />
      </div>
      <div className="admin-users-table-card flex flex-col w-full overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th className="font-medium whitespace-nowrap">Name</th>
                <th className="font-medium whitespace-nowrap">Email</th>
                <th className="font-medium whitespace-nowrap">Matric</th>
                <th className="font-medium whitespace-nowrap">Department</th>
                <th className="font-medium whitespace-nowrap">Level</th>
                <th className="font-medium whitespace-nowrap">Role</th>
              </tr>
            </thead>
            <tbody data-empty="No users found">
              {loading ? (
                <TableSkeleton rows={6} widths={["w-36", "w-48", "w-24", "w-32", "w-16", "w-24"]} />
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.uid}>
                    <td className="font-medium whitespace-nowrap text-text-primary">
                      <HighlightText query={search}>{user.fullName || "—"}</HighlightText>
                    </td>
                    <td className="admin-table-dept font-normal whitespace-nowrap text-text-secondary">
                      <HighlightText query={search}>{user.email || "—"}</HighlightText>
                    </td>
                    <td className="font-normal whitespace-nowrap text-text-secondary">
                      <HighlightText query={search}>{user.matricNumber || "—"}</HighlightText>
                    </td>
                    <td className="admin-table-dept font-normal whitespace-nowrap">{getDepartmentName(user.departmentId)}</td>
                    <td className="font-normal whitespace-nowrap text-text-secondary">{user.level ? `${user.level}` : "—"}</td>
                    <td className="whitespace-nowrap">
                      <select value={user.role} disabled={updatingId === user.uid || !isSuperAdmin} onChange={(e) => handleRoleChange(user.uid, e.target.value as User["role"])} className="select select-sm font-medium disabled:opacity-50">
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="admin-pagination flex items-center justify-between w-full">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="admin-page-btn font-medium disabled:opacity-40">
                Previous
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="admin-page-btn font-medium disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer className="admin-footer" />
    </div>
  );
};

export default AdminUsers;
