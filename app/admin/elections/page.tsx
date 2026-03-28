"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Plus, MoreHorizontal, Pencil, Trash2, BarChart3 } from "lucide-react";
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

const formatDate = (ts: { seconds: number }) =>
  new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

const AdminElectionsPage = () => {
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";

  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(
        query(collection(db, "elections"), orderBy("createdAt", "desc")),
      );
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Election);

      if (!isSuperAdmin && userProfile?.departmentId) {
        items = items.filter(
          (e) => e.departmentId === userProfile.departmentId,
        );
      }

      setElections(items);
      setLoading(false);
    };
    fetch();
  }, [isSuperAdmin, userProfile?.departmentId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this election? This cannot be undone.")) return;
    await deleteDoc(doc(db, "elections", id));
    setElections((prev) => prev.filter((e) => e.id !== id));
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
            className={cn(buttonVariants(), "font-sans rounded-none")}
          >
            <Plus className="mr-2 size-4" />
            Create Election
          </Link>
        )}
      </div>

      <div className="mt-6 border border-border">
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
                    {el.startDate ? formatDate(el.startDate) : "—"}
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
                          <DropdownMenuItem
                            onClick={() => handleDelete(el.id)}
                            className="text-red-600 focus:text-red-600"
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
