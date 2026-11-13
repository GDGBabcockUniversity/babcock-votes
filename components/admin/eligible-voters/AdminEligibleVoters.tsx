"use client";
import React, { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import Button from "@/components/common/Button";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import { TableSkeleton } from "@/components/common/skeleton";
import { HighlightText } from "@t007/utils/components/react";
import DialogModal from "@/components/common/DialogModal";
import { Actions, Action } from "@/components/common/Actions";
import { Input, useFormManager, type CE } from "@t007/input/react";
import { confirm } from "@t007/dialog";
import toast from "@/lib/toast";
import SearchIcon from "@icons/common/search.svg";
import "@/styles/common/Table.css";
import "@/styles/admin/eligible-voters.css";

interface EligibleVoterItem {
  docId: Id<"eligibleVoters">;
  matricNumber: string;
  fullName: string;
  departmentId: string;
  level: string;
  claimedByUid: string | null;
  claimedEmail: string | null;
}

interface VoterFormData {
  name: string;
  matric: string;
  level: string;
  loading?: boolean;
  error?: string;
}

const PAGE_SIZE = 50;

export const AdminEligibleVoters: React.FC = () => {
  const [department, setDepartment] = useState("accounting");
  const votersData = useQuery(api.eligibleVoters.listByDepartment, department ? { departmentId: department } : "skip");
  const createVoter = useMutation(api.eligibleVoters.create);
  const removeVoter = useMutation(api.eligibleVoters.remove);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<VoterFormData | null>(null);

  const voters: EligibleVoterItem[] = useMemo(() => (votersData ?? []) as EligibleVoterItem[], [votersData]);

  const filteredVoters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? voters : voters.filter((v) => v.fullName?.toLowerCase().includes(q) || v.matricNumber?.toLowerCase().includes(q));
  }, [voters, search]);

  const totalPages = Math.max(1, Math.ceil(filteredVoters.length / PAGE_SIZE));
  const paginatedVoters = useMemo(() => filteredVoters.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredVoters, page]);

  const { handleSubmit: handleCreateVoter } = useFormManager(async () => {
    if (!form || !form.name.trim() || !form.matric.trim()) return;
    setForm((f) => f && { ...f, loading: true, error: undefined });
    try {
      await createVoter({ fullName: form.name.trim(), matric: form.matric.trim(), departmentId: department, level: form.level });
      setForm(null);
    } catch (err) {
      setForm((f) => f && { ...f, loading: false, error: errorMessage(err, "Failed to add voter.") });
    }
  });
  const handleRemoveVoter = async (docId: Id<"eligibleVoters">, name: string) => {
    if (!(await confirm(`Remove ${name} from eligible voters?`))) return;
    try {
      await removeVoter({ docId });
      toast.success(`${name} removed from eligible voters.`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove voter."));
    }
  };

  const loading = votersData === undefined;

  return (
    <div className="admin-voters-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto">
      <div className="admin-voters-header flex items-start justify-between w-full max-md:flex-col max-md:items-start gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="admin-voters-title font-normal">Eligible voters</h1>
          <p className="admin-voters-subtitle font-normal">Who is allowed to vote, by department.</p>
        </div>
        <Button variant="stamp" onClick={() => setForm({ name: "", matric: "", level: "100" })} className="admin-elections-create-btn shrink-0">
          Add voter
        </Button>
      </div>
      <div className="admin-voters-controls flex items-end justify-between flex-wrap w-full gap-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3 w-full md:w-auto">
          <div className="admin-voters-dept-select flex flex-col gap-1.5 w-full md:w-64">
            <span className="text-sm font-semibold text-text-primary">Department</span>
            <select value={department} onChange={(e) => (setDepartment(e.target.value), setPage(1))} className="select w-full font-medium">
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="search-bar flex items-center w-full md:w-80 gap-2.5">
            <span className="search-bar-icon flex items-center justify-center shrink-0" aria-hidden="true">
              <SearchIcon className="size-4" />
            </span>
            <input type="text" placeholder="Search by name or matric number" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} className="search-bar-input flex-1 min-w-0" />
          </div>
        </div>
        <span className="admin-voters-count font-medium whitespace-nowrap">
          {filteredVoters.length} {filteredVoters.length === 1 ? "voter" : "voters"} in {getDepartmentName(department)}
        </span>
      </div>
      <div className="admin-voters-table-card flex flex-col w-full overflow-hidden">
        <div className="admin-table-wrapper w-full overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th className="font-medium whitespace-nowrap">Name</th>
                <th className="font-medium whitespace-nowrap">Matric</th>
                <th className="font-medium whitespace-nowrap">Level</th>
                <th className="font-medium whitespace-nowrap">Status</th>
                <th className="font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody data-empty="No eligible voters found for this department">
              {loading ? (
                <TableSkeleton rows={6} widths={["w-40", "w-24", "w-16", "w-24", "w-8"]} />
              ) : (
                paginatedVoters.map((voter) => {
                  const isRegistered = Boolean(voter.claimedByUid || voter.claimedEmail);

                  return (
                    <tr key={voter.docId}>
                      <td className="font-medium whitespace-nowrap text-text-primary">
                        <HighlightText query={search}>{voter.fullName}</HighlightText>
                      </td>
                      <td className="font-normal whitespace-nowrap text-text-secondary">
                        <HighlightText query={search}>{voter.matricNumber}</HighlightText>
                      </td>
                      <td className="font-normal whitespace-nowrap text-text-secondary">{voter.level}</td>
                      <td className="whitespace-nowrap">
                        <Chip text={isRegistered ? "Registered" : "Not registered"} tone={isRegistered ? "ok" : "neutral"} />
                      </td>
                      <td className="whitespace-nowrap">
                        <Actions position="bottom-left">
                          <Action danger onClick={() => handleRemoveVoter(voter.docId, voter.fullName)}>
                            Remove
                          </Action>
                        </Actions>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="admin-pagination flex items-center justify-between w-full">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredVoters.length)} of {filteredVoters.length}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="admin-page-btn">
                Previous
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="admin-page-btn">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <DialogModal open={Boolean(form)} onClose={() => setForm(null)} className="admin-dialog-voter">
        <div className="modal-header flex items-center justify-between shrink-0 w-full">
          <h2 className="modal-header-text font-serif">Add eligible voter</h2>
          <button type="button" onClick={() => setForm(null)} className="modal-close-btn" aria-label="Close">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {form && (
          <form onSubmit={handleCreateVoter} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
            <div className="modal-body flex flex-col flex-1 min-h-0 overflow-y-auto w-full">
              {form.error && <p className="text-sm text-red-500 font-medium">{form.error}</p>}
              <Input label="Full name" placeholder="e.g. John Doe" value={form.name} onChange={(e: CE<HTMLInputElement>) => setForm((f) => f && { ...f, name: e.target.value })} required />
              <Input label="Matric number" placeholder="e.g. 21/0431" value={form.matric} onChange={(e: CE<HTMLInputElement>) => setForm((f) => f && { ...f, matric: e.target.value })} required />
              <Input type="select" label="Level" value={form.level} onChange={(e: CE<HTMLSelectElement>) => setForm((f) => f && { ...f, level: e.target.value })} options={LEVELS.map((lvl) => ({ value: lvl, option: `${lvl} Level` }))} required />
            </div>
            <div className="modal-footer flex items-center justify-end gap-3 shrink-0 w-full">
              <Button variant="secondary" size="sm" onClick={() => setForm(null)} type="button">
                Cancel
              </Button>
              <Button variant="stamp" size="sm" type="submit" disabled={form.loading}>
                {form.loading ? "Adding..." : "Add voter"}
              </Button>
            </div>
          </form>
        )}
      </DialogModal>
      <Footer className="admin-footer" />
    </div>
  );
};

export default AdminEligibleVoters;
