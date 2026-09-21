"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/context/auth-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { User } from "@/lib/types";
import { getDepartmentName } from "@/lib/utils";

const ROLES = ["voter", "viewer", "dept_admin", "super_admin"] as const;
const PAGE_SIZE = 20;

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  dept_admin: "secondary",
  voter: "outline",
  viewer: "outline",
};

const roleLabel: Record<string, string> = {
  voter: "Voter",
  viewer: "Results Viewer",
  dept_admin: "Department Admin",
  super_admin: "Super Admin",
};

const UsersPage = () => {
  const { authUser, userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";
  const usersData = useQuery(api.users.list);
  const users: (User & { uid: string })[] = usersData ?? [];
  const loading = usersData === undefined;
  const setRole = useMutation(api.users.setRole);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // The list is live, so a role change shows up by itself once it's saved.
  const handleRoleChange = async (uid: string, newRole: string) => {
    setUpdating(uid);
    try {
      await setRole({
        userId: uid as Id<"users">,
        role: newRole as User["role"],
      });
    } catch (err) {
      alert(errorMessage(err, "Failed to update role."));
    } finally {
      setUpdating(null);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const filtered = search
    ? users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.matricNumber.toLowerCase().includes(search.toLowerCase()) ||
          getDepartmentName(u.departmentId)
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : users;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePagePage = Math.min(page, totalPages);
  const startIndex = (safePagePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
        User Management
      </h1>
      <p className="mt-1 text-sm md:text-base lg:text-lg font-sans text-muted-gray">
        View all registered users and manage their roles.
      </p>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-gray" />
        <Input
          placeholder="Search by name, email, matric..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="mt-4 rounded-sm border border-border">
        <Table className="font-sans rounded-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Matric</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="mx-auto size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-gray"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((u) => {
                const isSelf = u.uid === authUser?.id;
                return (
                  <TableRow key={u.uid}>
                    <TableCell className="font-medium pl-4">
                      {u.fullName}
                    </TableCell>
                    <TableCell className="text-muted-gray">{u.email}</TableCell>
                    <TableCell className="text-muted-gray">
                      {u.matricNumber}
                    </TableCell>
                    <TableCell className="text-muted-gray">
                      {getDepartmentName(u.departmentId)}
                    </TableCell>
                    <TableCell className="text-muted-gray">{u.level}</TableCell>
                    <TableCell>
                      {isSelf || !isSuperAdmin ? (
                        <Badge variant={roleBadgeVariant[u.role]}>
                          {roleLabel[u.role]}
                        </Badge>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v) =>
                            handleRoleChange(u.uid, v ?? u.role)
                          }
                          disabled={updating === u.uid}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue render={<p>{roleLabel[u.role]}</p>} />
                          </SelectTrigger>
                          <SelectContent className="font-sans">
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {roleLabel[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between font-sans text-sm">
          <p className="text-muted-gray">
            Showing{" "}
            <span className="font-medium text-foreground">
              {startIndex + 1}&ndash;
              {Math.min(startIndex + PAGE_SIZE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePagePage <= 1}
              className="flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-gold/50 disabled:opacity-40 disabled:hover:border-border"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </button>
            <span className="min-w-16 text-center text-xs text-muted-gray">
              Page {safePagePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePagePage >= totalPages}
              className="flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-gold/50 disabled:opacity-40 disabled:hover:border-border"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
