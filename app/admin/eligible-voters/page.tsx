"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";
import { getDepartmentName, matricToDocId } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { EligibleVoter } from "@/lib/types";

type VoterRow = EligibleVoter & { docId: string; matricNumber: string };

const EligibleVotersPage = () => {
  const [department, setDepartment] = useState("");
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMatric, setAddMatric] = useState("");
  const [addLevel, setAddLevel] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchVoters = async (deptId: string) => {
    setLoading(true);
    const q = query(
      collection(db, "eligible_voters"),
      where("departmentId", "==", deptId),
    );
    const snap = await getDocs(q);
    const rows: VoterRow[] = snap.docs.map((d) => ({
      docId: d.id,
      matricNumber: d.id.replace(/-/g, "/"),
      ...(d.data() as EligibleVoter),
    }));
    rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
    setVoters(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (department) {
      fetchVoters(department);
      setShowAdd(false);
      setEditId(null);
    } else {
      setVoters([]);
    }
  }, [department]);

  const filtered = search
    ? voters.filter(
        (v) =>
          v.fullName.toLowerCase().includes(search.toLowerCase()) ||
          v.matricNumber.toLowerCase().includes(search.toLowerCase()),
      )
    : voters;

  // --- Add ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const safeMatric = addMatric.trim();
    if (!/^\d{2}\/\d{4}$/.test(safeMatric)) {
      setAddError("Matric must be in format XX/XXXX (e.g., 21/0456).");
      return;
    }
    if (!addLevel) {
      setAddError("Please select a level.");
      return;
    }

    setAddLoading(true);
    try {
      const docId = matricToDocId(safeMatric);
      const existing = await getDoc(doc(db, "eligible_voters", docId));
      if (existing.exists()) {
        setAddError("A voter with this matric number already exists.");
        setAddLoading(false);
        return;
      }

      await setDoc(doc(db, "eligible_voters", docId), {
        fullName: addName.trim(),
        departmentId: department,
        level: addLevel,
      });

      // Refresh
      setAddName("");
      setAddMatric("");
      setAddLevel("");
      setShowAdd(false);
      await fetchVoters(department);
    } catch {
      setAddError("Failed to add voter. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // --- Edit ---
  const startEdit = (voter: VoterRow) => {
    setEditId(voter.docId);
    setEditName(voter.fullName);
    setEditLevel(voter.level);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = async (docId: string) => {
    setEditLoading(true);
    try {
      await updateDoc(doc(db, "eligible_voters", docId), {
        fullName: editName.trim(),
        level: editLevel,
      });
      setVoters((prev) =>
        prev.map((v) =>
          v.docId === docId
            ? { ...v, fullName: editName.trim(), level: editLevel }
            : v,
        ),
      );
      setEditId(null);
    } catch {
      // silent
    } finally {
      setEditLoading(false);
    }
  };

  // --- Delete ---
  const handleDelete = async (voter: VoterRow) => {
    if (voter.claimedByUid) {
      if (
        !window.confirm(
          "This voter has already registered. Deleting will NOT remove their user account. Continue?",
        )
      )
        return;
    } else {
      if (!window.confirm(`Delete ${voter.fullName} (${voter.matricNumber})?`))
        return;
    }

    setDeleteLoading(voter.docId);
    try {
      await deleteDoc(doc(db, "eligible_voters", voter.docId));
      setVoters((prev) => prev.filter((v) => v.docId !== voter.docId));
    } catch {
      // silent
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold md:text-3xl lg:text-4xl">
        Eligible Voters
      </h1>
      <p className="mt-1 font-sans text-sm text-muted-gray md:text-base lg:text-lg">
        Manage the voter whitelist by department.
      </p>

      {/* Department selector */}
      <div className="mt-6 max-w-sm">
        <label className="mb-2 block text-sm font-medium font-sans">
          Department
        </label>
        <Select value={department} onValueChange={(v) => setDepartment(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select a department" />
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
                {voters.length} voter{voters.length !== 1 ? "s" : ""} in{" "}
                {getDepartmentName(department)}
              </span>
              <button
                onClick={() => {
                  setShowAdd(!showAdd);
                  setAddError("");
                }}
                className="flex items-center gap-1.5 bg-gold px-3 py-2 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus className="size-4" />
                Add Voter
              </button>
            </div>
          </div>

          {/* Add form */}
          {showAdd && (
            <form
              onSubmit={handleAdd}
              className="mt-4 border border-border bg-white p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block font-sans text-xs font-medium">
                    Full Name
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-sans text-xs font-medium">
                    Matric Number
                  </label>
                  <Input
                    placeholder="e.g., 21/0456"
                    value={addMatric}
                    onChange={(e) => setAddMatric(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-sans text-xs font-medium">
                    Level
                  </label>
                  <Select value={addLevel} onValueChange={(v) => setAddLevel(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="bg-gold px-4 py-2 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {addLoading ? "Adding..." : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="border border-border px-4 py-2 font-sans text-sm font-medium text-charcoal transition-colors hover:border-gold/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {addError && (
                <p className="mt-2 font-sans text-xs text-red-600">
                  {addError}
                </p>
              )}
            </form>
          )}

          {/* Table */}
          <div className="mt-4 border border-border">
            <Table className="rounded-none font-sans">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Matric</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right pr-4">
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
                ) : filtered.length === 0 ? (
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
                  filtered.map((v) => {
                    const isEditing = editId === v.docId;
                    return (
                      <TableRow key={v.docId}>
                        <TableCell className="pl-4 font-medium">
                          {isEditing ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : (
                            v.fullName
                          )}
                        </TableCell>
                        <TableCell className="text-muted-gray">
                          {v.matricNumber}
                        </TableCell>
                        <TableCell className="text-muted-gray">
                          {isEditing ? (
                            <Select
                              value={editLevel}
                              onValueChange={(v) => setEditLevel(v ?? "")}
                            >
                              <SelectTrigger className="h-8 w-20 text-xs">
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
                          ) : (
                            v.level
                          )}
                        </TableCell>
                        <TableCell>
                          {v.claimedByUid ? (
                            <Badge variant="default">Claimed</Badge>
                          ) : (
                            <Badge variant="outline">Unclaimed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(v.docId)}
                                disabled={editLoading}
                                className="p-1 text-green-600 hover:bg-green-50"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-muted-gray hover:bg-secondary"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(v)}
                                className="p-1 text-muted-gray hover:bg-secondary hover:text-charcoal"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(v)}
                                disabled={deleteLoading === v.docId}
                                className="p-1 text-muted-gray hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default EligibleVotersPage;
