"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  BarChart3,
  Copy,
} from "lucide-react";
import type { Election } from "@/lib/types";
import { cn, getDepartmentName } from "@/lib/utils";
import { PAGES } from "@/lib/constants";

const statusVariant: Record<
  Election["status"],
  "default" | "secondary" | "outline"
> = {
  active: "default",
  upcoming: "secondary",
  closed: "outline",
};

const AdminElectionsPage = () => {
  const { authUser, userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";

  // Live: changes made anywhere (or by another admin) show up immediately.
  const electionsData = useQuery(api.elections.list, { orderBy: "createdAt" });
  const loading = electionsData === undefined;
  const departmentId = userProfile?.departmentId;
  const elections: Election[] = useMemo(
    () =>
      (electionsData ?? []).filter(
        (e) => isSuperAdmin || !departmentId || e.departmentId === departmentId,
      ),
    [electionsData, isSuperAdmin, departmentId],
  );

  const duplicateElection = useMutation(api.elections.duplicate);
  const removeElection = useMutation(api.elections.remove);

  const handleDuplicate = async (id: string) => {
    if (!authUser || !isSuperAdmin) return;

    try {
      const result = await duplicateElection({ id: id as Id<"elections"> });
      alert(
        `Election duplicated successfully. Copied ${result.positions} positions and ${result.candidates} candidates.`,
      );
    } catch (error) {
      console.error("[handleDuplicate] Failed to duplicate election:", error);
      alert(errorMessage(error, "Failed to duplicate election. Check console for details."));
    }
  };

  const handleDelete = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Delete this election? This will also remove all nested data. This cannot be undone.")) return;

    try {
      await removeElection({ id: id as Id<"elections"> });
    } catch (error) {
      console.error("[handleDelete] Failed to delete election:", error);
      alert(errorMessage(error, "Failed to delete election. Check console for details."));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">
            Elections
          </h1>
          <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-gray font-sans">
            {isSuperAdmin
              ? "Manage all elections."
              : `Elections for ${getDepartmentName(userProfile?.departmentId || "")}.`}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            href={PAGES.admin.newElection}
            className={cn(buttonVariants(), "font-sans rounded-sm")}
          >
            <Plus className="mr-2 size-4" />
            Create Election
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-sm border border-border">
        <Table className="font-sans">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Candidates</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="mx-auto size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                </TableCell>
              </TableRow>
            ) : elections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-gray"
                >
                  No elections found.
                </TableCell>
              </TableRow>
            ) : (
              elections.map((el) => (
                <TableRow key={el.id}>
                  <TableCell>
                    <Link
                      href={PAGES.admin.electionDetail(el.id)}
                      className="font-medium hover:underline"
                    >
                      {el.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-gray">
                    {getDepartmentName(el.departmentId)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant[el.status]}
                      className="capitalize"
                    >
                      {el.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-gray">
                    {el.startDate ? formatShortDate(el.startDate) : "—"}
                  </TableCell>
                  <TableCell>{el.candidateCount ?? 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="font-sans">
                        <DropdownMenuItem
                          render={
                            <Link href={PAGES.admin.electionDetail(el.id)}>
                              <Pencil className="mr-2 size-3.5" />
                              Manage
                            </Link>
                          }
                        />
                        <DropdownMenuItem
                          render={
                            <Link href={PAGES.admin.electionResults(el.id)}>
                              <BarChart3 className="mr-2 size-3.5" />
                              Results
                            </Link>
                          }
                        />
                        {isSuperAdmin && (
                          <DropdownMenuItem onClick={() => handleDuplicate(el.id)}>
                            <Copy className="mr-2 size-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        {isSuperAdmin && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(el.id)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminElectionsPage;
