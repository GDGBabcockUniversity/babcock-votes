"use client";

import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { DEPARTMENTS, LEVELS, MATRIC_REGEX } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { EligibleVoter } from "@/lib/types";

type VoterRow = EligibleVoter & { docId: string; matricNumber: string };

const PAGE_SIZE = 50;

const EligibleVotersPage = () => {
  const [department, setDepartment] = useState("accounting");
  const votersData = useQuery(
    api.eligibleVoters.listByDepartment,
    department ? { departmentId: department } : "skip",
  );
  const voters: VoterRow[] = useMemo(() => votersData ?? [], [votersData]);
  const loading = !!department && votersData === undefined;
  const createVoter = useMutation(api.eligibleVoters.create);
  const updateVoter = useMutation(api.eligibleVoters.update);
  const removeVoter = useMutation(api.eligibleVoters.remove);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form data
  const [formName, setFormName] = useState("");
  const [formMatric, setFormMatric] = useState("");
  const [formLevel, setFormLevel] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Selected voter for edit/delete
  const [selectedVoter, setSelectedVoter] = useState<VoterRow | null>(null);

  const changeDepartment = (id: string) => {
    setDepartment(id);
    setPage(1);
    setSearch("");
  };

  const filtered = useMemo(() => {
    if (!search) return voters;
    const lower = search.toLowerCase();
    return voters.filter(
      (v) =>
        v.fullName.toLowerCase().includes(lower) ||
        v.matricNumber.toLowerCase().includes(lower),
    );
  }, [voters, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // --- Add ---
  const openAddDialog = () => {
    setFormName("");
    setFormMatric("");
    setFormLevel("");
    setFormError("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    setFormError("");
    const safeMatric = formMatric.trim();
    if (!MATRIC_REGEX.test(safeMatric)) {
      setFormError(
        "Matric must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222).",
      );
      return;
    }
    if (!formName.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!formLevel) {
      setFormError("Please select a level.");
      return;
    }

    setFormLoading(true);
    try {
      await createVoter({
        matric: safeMatric,
        fullName: formName.trim(),
        departmentId: department,
        level: formLevel,
      });

      setAddOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, "Failed to add voter. Please try again."));
        } finally {
      setFormLoading(false);
    }
  };

  // --- Edit ---
  const openEditDialog = (voter: VoterRow) => {
    setSelectedVoter(voter);
    setFormName(voter.fullName);
    setFormLevel(voter.level);
    setFormError("");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedVoter) return;
    if (!formName.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!formLevel) {
      setFormError("Please select a level.");
      return;
    }

    setFormLoading(true);
    try {
      await updateVoter({
        docId: selectedVoter.docId as Id<"eligibleVoters">,
        fullName: formName.trim(),
        level: formLevel,
      });
      setEditOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, "Failed to update voter."));
        } finally {
      setFormLoading(false);
    }
  };

  // --- Delete ---
  const openDeleteDialog = (voter: VoterRow) => {
    setSelectedVoter(voter);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedVoter) return;
    setFormLoading(true);
    try {
      await removeVoter({ docId: selectedVoter.docId as Id<"eligibleVoters"> });
      setDeleteOpen(false);
    } catch (err) {
      alert(errorMessage(err, "Failed to delete voter."));
        } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold md:text-3xl lg:text-4xl">
        Eligible Voters
      </h1>
      <p className="mt-1 font-sans text-sm text-muted-gray md:text-base">
        Manage the voter whitelist by department.
      </p>

      {/* Department selector */}
      <div className="mt-6 max-w-sm">
        <Label className="mb-2 font-sans">Department</Label>
        <Select
          value={department}
          onValueChange={(v) => changeDepartment(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue
              placeholder="Select a department"
              render={
                <p>{DEPARTMENTS.find((e) => e.id === department)?.name}</p>
              }
            />
          </SelectTrigger>
          <SelectContent className="font-sans">
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!department && (
        <p className="mt-8 text-center font-sans text-sm text-muted-gray">
          Select a department to view eligible voters.
        </p>
      )}

      {department && (
        <>
          {/* Toolbar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-gray" />
              <Input
                placeholder="Search by name or matric..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="font-sans text-sm text-muted-gray">
                {filtered.length} voter{filtered.length !== 1 ? "s" : ""} in{" "}
                {getDepartmentName(department)}
              </span>
              <Button
                onClick={openAddDialog}
                className="rounded-sm bg-gold font-sans text-sm font-semibold text-white hover:bg-gold/90"
              >
                <Plus className="mr-1.5 size-4" />
                Add Voter
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 rounded-sm border border-border">
            <Table className="rounded-sm font-sans">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Matric</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 pr-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="mx-auto size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-sm text-muted-gray"
                    >
                      {search
                        ? "No voters match your search."
                        : "No eligible voters in this department."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((v) => (
                    <TableRow key={v.docId}>
                      <TableCell className="pl-4 font-medium">
                        {v.fullName}
                      </TableCell>
                      <TableCell className="text-muted-gray">
                        {v.matricNumber}
                      </TableCell>
                      <TableCell className="text-muted-gray">
                        {v.level}
                      </TableCell>
                      <TableCell>
                        {v.claimedByUid ? (
                          <Badge variant="default">Claimed</Badge>
                        ) : (
                          <Badge variant="outline">Unclaimed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditDialog(v)}
                            className="cursor-pointer rounded-sm p-1 text-muted-gray hover:bg-secondary hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(v)}
                            className="cursor-pointer rounded-sm p-1 text-muted-gray hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-sans text-sm">
              <span className="text-muted-gray">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-sm"
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-sm"
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Eligible Voter</DialogTitle>
            <DialogDescription>
              Add a new voter to the {getDepartmentName(department)} whitelist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Matric Number</Label>
              <Input
                placeholder="e.g., 21/0456"
                value={formMatric}
                onChange={(e) => setFormMatric(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={formLevel}
                onValueChange={(v) => setFormLevel(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="font-sans">
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={formLoading}
                className="rounded-sm bg-gold text-white hover:bg-gold/90"
              >
                {formLoading ? "Adding..." : "Add Voter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Voter</DialogTitle>
            <DialogDescription>
              {selectedVoter?.matricNumber} — Matric number cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={formLevel}
                onValueChange={(v) => setFormLevel(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-sans">
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={formLoading}
                className="rounded-sm bg-gold text-white hover:bg-gold/90"
              >
                {formLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="font-sans sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Voter</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{selectedVoter?.fullName}</strong> (
              {selectedVoter?.matricNumber})?
            </DialogDescription>
          </DialogHeader>
          {selectedVoter?.claimedByUid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              ⚠ This voter has already registered. Deleting will NOT remove
              their user account.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={formLoading}
              variant="destructive"
              className="rounded-sm"
            >
              {formLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EligibleVotersPage;
