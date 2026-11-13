"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { toDate } from "@/lib/date";
import { useUploadImage } from "@/lib/upload";
import { useAuth } from "@/context/auth-context";
import { DEPARTMENTS, LEVELS, PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import Button, { ButtonLink } from "@/components/common/Button";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import Avatar from "@/components/common/Avatar";
import DialogModal from "@/components/common/DialogModal";
import AdminElectionDetailSkeleton from "@/components/common/skeleton/AdminElectionDetailSkeleton";
import { Actions, Action } from "@/components/common/Actions";
import { Input, useFormManager, type CE } from "@t007/input/react";
import { confirm } from "@t007/dialog";
import toast from "@/lib/toast";
import type { Election, Position, Candidate } from "@/lib/types";
import "@/styles/admin/election-detail.css";

interface PosFormData {
  id?: string;
  title: string;
  desc: string;
  order: number;
  levels: string[];
}

interface CandFormData {
  id?: string;
  posId: string;
  name: string;
  manifesto: string;
  dept: string;
  level: string;
  photo?: File | null;
  preview?: string;
  removePhoto?: boolean;
  error?: string;
  dragging?: boolean;
}

interface EditFormData {
  title: string;
  desc: string;
  deptId: string;
  startDate: string;
  endDate: string;
  minWinnerPct: string;
  logoFile?: File | null;
  logoPreview?: string;
  removeLogo?: boolean;
}

const toDatetimeLocal = (value: number) => {
  const d = toDate(value) ?? new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminElectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";

  const detail = useQuery(api.elections.detail, { id });
  const election: Election | null = detail?.election ?? null;
  const positions: Position[] = detail?.positions ?? [];
  const candidates: Candidate[] = detail?.candidates ?? [];
  const loading = detail === undefined;

  const electionId = id as Id<"elections">;
  const updateElection = useMutation(api.elections.update);
  const createPosition = useMutation(api.positions.create);
  const updatePosition = useMutation(api.positions.update);
  const removePosition = useMutation(api.positions.remove);
  const createCandidate = useMutation(api.candidates.create);
  const updateCandidate = useMutation(api.candidates.update);
  const removeCandidate = useMutation(api.candidates.remove);
  const uploadImage = useUploadImage();

  const [saving, setSaving] = useState(false);
  const [posForm, setPosForm] = useState<PosFormData | null>(null);
  const [candForm, setCandForm] = useState<CandFormData | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);

  const runAction = async (action: () => Promise<void>, successMsg?: string) => {
    try {
      await action();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posForm || !posForm.title.trim()) return;
    setSaving(true);
    await runAction(async () => {
      const data = { title: posForm.title.trim(), description: posForm.desc.trim(), order: posForm.order, allowedLevels: posForm.levels };
      posForm.id ? await updatePosition({ id: posForm.id as Id<"positions">, ...data }) : await createPosition({ electionId, ...data });
      setPosForm(null);
    });
    setSaving(false);
  };
  const handleDeletePosition = async (posId: string) => {
    if (!(await confirm("Delete this position and all its candidates?"))) return;
    await runAction(async () => {
      await removePosition({ id: posId as Id<"positions"> });
    });
  };

  const setPhotoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setCandForm((c) => c && { ...c, error: "Please choose an image file." });
    setCandForm((c) => c && { ...c, photo: file, preview: URL.createObjectURL(file), removePhoto: false, error: undefined });
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candForm || !candForm.name.trim() || !candForm.posId) return;
    setSaving(true);
    await runAction(async () => {
      const photoStorageId = candForm.photo ? await uploadImage(candForm.photo) : candForm.removePhoto ? null : undefined;
      const data = { fullName: candForm.name.trim(), manifesto: candForm.manifesto.trim(), departmentId: candForm.dept, level: candForm.level, positionId: candForm.posId as Id<"positions"> };
      candForm.id ? await updateCandidate({ id: candForm.id as Id<"candidates">, ...data, photoStorageId }) : await createCandidate({ electionId, ...data, photoStorageId: photoStorageId ?? undefined });
      setCandForm(null);
    });
    setSaving(false);
  };
  const handleDeleteCandidate = async (candId: string) => {
    if (!(await confirm("Delete this candidate?"))) return;
    await runAction(async () => {
      await removeCandidate({ id: candId as Id<"candidates"> });
    });
  };
  const handleStatusChange = async (newStatus: string) => {
    await runAction(async () => {
      await updateElection({ id: electionId, status: newStatus as Election["status"] });
    }, `Election status changed to ${newStatus}`);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !editForm.title.trim() || !editForm.deptId) return;
    setSaving(true);
    await runAction(async () => {
      const logoStorageId = editForm.logoFile ? await uploadImage(editForm.logoFile) : editForm.removeLogo ? null : undefined;
      await updateElection({
        id: electionId,
        title: editForm.title.trim(),
        description: editForm.desc.trim(),
        departmentId: editForm.deptId,
        ...(logoStorageId !== undefined && { logoStorageId }),
        startDate: new Date(editForm.startDate).getTime(),
        endDate: new Date(editForm.endDate).getTime(),
        minWinnerPercentage: editForm.minWinnerPct.trim() ? Number(editForm.minWinnerPct) : null,
      });
      setEditForm(null);
    });
    setSaving(false);
  };

  const { handleSubmit: handlePositionSubmit } = useFormManager(handleSavePosition);
  const { handleSubmit: handleCandidateSubmit } = useFormManager(handleSaveCandidate);
  const { handleSubmit: handleDetailsSubmit } = useFormManager(handleSaveDetails);

  if (loading) return <AdminElectionDetailSkeleton />;

  if (!election)
    return (
      <div className="admin-detail-page flex flex-col items-center justify-center flex-1">
        <p className="text-sm text-text-secondary">Election not found.</p>
        <ButtonLink href={PAGES.admin.elections} variant="secondary" className="mt-4">
          Back to Elections
        </ButtonLink>
      </div>
    );

  const candidatesByPosition: Record<string, Candidate[]> = {};
  positions.forEach((p) => (candidatesByPosition[p.id] = []));
  candidates.forEach((c) => candidatesByPosition[c.positionId]?.push(c));

  return (
    <div className="admin-detail-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto">
      <div className="flex flex-col gap-1 w-full">
        <Link href={PAGES.admin.elections} className="text-sm font-semibold text-text-secondary hover:text-text-primary no-underline mb-2">
          Back to elections
        </Link>
        <div className="admin-detail-header flex items-start justify-between flex-wrap w-full gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {election.logoUrl && <Avatar src={election.logoUrl} name={election.title} size="lg" />}
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="admin-detail-title font-normal">{election.title}</h1>
              <div className="flex items-center gap-3 flex-wrap text-sm text-text-secondary">
                <span>{getDepartmentName(election.departmentId)}</span>
                <span>&bull;</span>
                <Chip text={election.status.charAt(0).toUpperCase() + election.status.slice(1)} tone={election.status === "active" ? "ok" : election.status === "upcoming" ? "ink" : "neutral"} />
                {election.minWinnerPercentage && (
                  <>
                    <span>&bull;</span>
                    <span>Unopposed threshold: {election.minWinnerPercentage}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <div className="admin-status-dropdown-wrap flex items-center gap-1">
                <span className="text-xs text-text-secondary font-medium">Status:</span>
                <select defaultValue={election.status} key={election.status} onChange={(e) => handleStatusChange(e.target.value)} className="select font-medium">
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
            <ButtonLink href={PAGES.admin.electionResults(election.id)} variant="secondary" size="sm">
              Results
            </ButtonLink>
            <ButtonLink href={PAGES.admin.electionAnalytics(election.id)} variant="secondary" size="sm">
              Analytics
            </ButtonLink>
            {isSuperAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setEditForm({ title: election.title, desc: election.description || "", deptId: election.departmentId, startDate: toDatetimeLocal(election.startDate), endDate: toDatetimeLocal(election.endDate), minWinnerPct: election.minWinnerPercentage?.toString() ?? "", logoPreview: election.logoUrl || "" })}>
                Edit Details
              </Button>
            )}
          </div>
        </div>
      </div>
      {election.description && <p className="admin-detail-desc font-normal">{election.description}</p>}
      <div className="admin-dates-bar flex items-center gap-6 flex-wrap w-full text-xs">
        <div>
          <span className="text-text-secondary font-medium">Starts: </span>
          <span className="font-semibold text-text-primary">{new Date(election.startDate).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-text-secondary font-medium">Ends: </span>
          <span className="font-semibold text-text-primary">{new Date(election.endDate).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center justify-between w-full mt-2">
        <h2 className="admin-section-heading font-normal">Positions & Candidates</h2>
        {isSuperAdmin && (
          <Button variant="stamp" size="sm" onClick={() => setPosForm({ title: "", desc: "", order: positions.length, levels: [] })}>
            Add Position
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-4 w-full">
        {positions.length === 0 ? (
          <div className="admin-empty-positions flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-text-secondary font-normal">No positions added yet.</p>
            {isSuperAdmin && (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setPosForm({ title: "", desc: "", order: 0, levels: [] })}>
                Add your first position
              </Button>
            )}
          </div>
        ) : (
          positions.map((position) => {
            const posCandidates = candidatesByPosition[position.id] || [];

            return (
              <div key={position.id} className="admin-pos-card flex flex-col w-full gap-5">
                <div className="admin-pos-header flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="admin-pos-title font-semibold">{position.title}</span>
                    {position.description && <span className="admin-pos-desc font-normal">{position.description}</span>}
                    {position.allowedLevels && position.allowedLevels.length > 0 && <span className="admin-pos-levels font-normal">Restricted to: {position.allowedLevels.map((l) => (l.includes("00") ? `${l}L` : l)).join(", ")}</span>}
                  </div>
                  {isSuperAdmin && (
                    <Actions position="bottom-left">
                      <Action onClick={() => setPosForm({ id: position.id, title: position.title, desc: position.description, order: position.order, levels: position.allowedLevels || [] })}>Edit Position</Action>
                      <Action danger onClick={() => handleDeletePosition(position.id)}>
                        Delete Position
                      </Action>
                    </Actions>
                  )}
                </div>
                <div className="admin-cand-grid grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {posCandidates.map((c) => (
                    <div key={c.id} className="admin-cand-card flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={c.photoUrl} name={c.fullName} size="md" />
                        <div className="flex flex-col min-w-0">
                          <span className="admin-cand-name font-semibold truncate">{c.fullName}</span>
                          <span className="admin-cand-meta truncate">
                            {getDepartmentName(c.departmentId)}
                            {c.level && ` • ${c.level}L`}
                          </span>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <Actions position="bottom-left">
                          <Action onClick={() => setCandForm({ id: c.id, posId: c.positionId, name: c.fullName, manifesto: c.manifesto || "", dept: c.departmentId || "", level: c.level || "", preview: c.photoUrl || "" })}>Edit Candidate</Action>
                          <Action danger onClick={() => handleDeleteCandidate(c.id)}>
                            Delete Candidate
                          </Action>
                        </Actions>
                      )}
                    </div>
                  ))}
                </div>
                {isSuperAdmin && (
                  <div>
                    <Button variant="secondary" size="sm" onClick={() => setCandForm({ posId: position.id, name: "", manifesto: "", dept: "", level: "" })}>
                      Add Candidate
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <DialogModal open={Boolean(posForm)} onClose={() => setPosForm(null)} className="admin-dialog-pos">
        <div className="modal-header flex items-center justify-between shrink-0 w-full">
          <span className="modal-header-text font-normal">{posForm?.id ? "Edit Position" : "Add Position"}</span>
          <button data-close type="button" onClick={() => setPosForm(null)} className="modal-close-btn">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {posForm && (
          <form onSubmit={handlePositionSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
            <div className="modal-body flex flex-col flex-1 min-h-0 overflow-y-auto w-full">
              <Input label="Title" placeholder="e.g. President" required value={posForm.title} onChange={(e: CE<HTMLInputElement>) => setPosForm((p) => p && { ...p, title: e.target.value })} />
              <div className="flex flex-col gap-1.5 w-full mb-4">
                <span className="text-xs text-text-secondary font-medium">Eligible Levels (Optional)</span>
                <p className="text-xs text-text-secondary">Leave empty to allow all levels to vote for this position.</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["100", "200", "300", "400", "500", "600", "Part-Time", "Post-Graduate"].map((lvl) => {
                    const active = posForm.levels.includes(lvl);
                    return (
                      <button key={lvl} type="button" onClick={() => setPosForm((p) => p && { ...p, levels: p.levels.includes(lvl) ? p.levels.filter((l) => l !== lvl) : [...p.levels, lvl] })} className={clsx("admin-level-chip select-none gap-1.5", active && "active font-semibold")}>
                        {lvl.includes("00") ? `${lvl}L` : lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Input label="Description" type="textarea" placeholder="Brief description..." value={posForm.desc} onChange={(e: CE<HTMLTextAreaElement>) => setPosForm((p) => p && { ...p, desc: e.target.value })} rows={3} />
              <Input label="Display Order" type="number" value={posForm.order} onChange={(e: CE<HTMLInputElement>) => setPosForm((p) => p && { ...p, order: Number(e.target.value) })} />
            </div>
            <div className="modal-footer flex items-center justify-end gap-3 shrink-0 w-full">
              <Button variant="secondary" size="sm" type="button" onClick={() => setPosForm(null)}>
                Cancel
              </Button>
              <Button variant="stamp" size="sm" type="submit" disabled={saving || !posForm.title.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}
      </DialogModal>
      <DialogModal open={Boolean(candForm)} onClose={() => setCandForm(null)} className="admin-dialog-cand">
        <div className="modal-header flex items-center justify-between shrink-0 w-full">
          <span className="modal-header-text font-normal">{candForm?.id ? "Edit Candidate" : "Add Candidate"}</span>
          <button data-close type="button" onClick={() => setCandForm(null)} className="modal-close-btn">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {candForm && (
          <form onSubmit={handleCandidateSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
            <div className="modal-body flex flex-col flex-1 min-h-0 overflow-y-auto w-full">
              <Input label="Full Name" placeholder="Candidate name" required value={candForm.name} onChange={(e: CE<HTMLInputElement>) => setCandForm((c) => c && { ...c, name: e.target.value })} />
              <Input isWrapper label="Photo" fieldClassName="file-input w-full">
                <label onDragOver={(e) => (e.preventDefault(), (e.dataTransfer.dropEffect = "copy"), setCandForm((c) => c && { ...c, dragging: true }))} onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setCandForm((c) => c && { ...c, dragging: false })} onDrop={(e) => (e.preventDefault(), setCandForm((c) => c && { ...c, dragging: false }), setPhotoFile(e.dataTransfer.files?.[0]))} className={clsx("file-drag-area flex flex-col items-center justify-center text-center cursor-pointer w-full gap-2 py-4", candForm.dragging && "dragging")}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => (setPhotoFile(e.target.files?.[0]), (e.target.value = ""))} />
                  {candForm.preview ? (
                    <div className="flex flex-col items-center gap-2">
                      <Avatar src={candForm.preview} name={candForm.name} size="xl" radius="sm" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary font-medium">Click to change</span>
                        <span className="text-xs text-text-secondary">•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCandForm((c) => c && { ...c, photo: null, preview: "", removePhoto: true });
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold text-text-primary">Click to upload photo</span>
                      <span className="text-xs text-text-secondary">PNG, JPG or SVG up to 5MB</span>
                    </div>
                  )}
                </label>
              </Input>
              {candForm.error && <p className="text-xs text-red-500 font-medium">{candForm.error}</p>}
              <div className="flex flex-col w-full">
                <Input label="Manifesto" type="textarea" maxLength={3000} value={candForm.manifesto} onChange={(e: CE<HTMLTextAreaElement>) => e.target.value.length <= 3000 && setCandForm((c) => c && { ...c, manifesto: e.target.value })} placeholder="Candidate manifesto or bio..." rows={3} />
                <span className={clsx("text-right text-xs -mt-3 mb-1", candForm.manifesto.length > 2800 ? "text-red-500 font-medium" : "text-text-secondary")}>{candForm.manifesto.length} / 3000</span>
              </div>
              <div className="grid gap-x-4 gap-y-0 sm:grid-cols-2 w-full">
                <Input label="Department" type="select" defaultValue={candForm.dept} onChange={(e: CE<HTMLSelectElement>) => setCandForm((c) => c && { ...c, dept: e.target.value })} options={[{ value: "", option: "Select Department" }, ...DEPARTMENTS.map((d) => ({ value: d.id, option: d.name }))]} />
                <Input label="Level" type="select" defaultValue={candForm.level} onChange={(e: CE<HTMLSelectElement>) => setCandForm((c) => c && { ...c, level: e.target.value })} options={[{ value: "", option: "Select Level" }, ...LEVELS.map((lvl) => ({ value: lvl, option: `${lvl} Level` }))]} />
              </div>
            </div>
            <div className="modal-footer flex items-center justify-end gap-3 shrink-0 w-full">
              <Button variant="secondary" size="sm" type="button" onClick={() => setCandForm(null)}>
                Cancel
              </Button>
              <Button variant="stamp" size="sm" type="submit" disabled={saving || !candForm.name.trim() || !candForm.posId}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}
      </DialogModal>
      <DialogModal open={Boolean(editForm)} onClose={() => setEditForm(null)} className="admin-dialog-edit">
        <div className="modal-header flex items-center justify-between shrink-0 w-full">
          <span className="modal-header-text font-normal">Edit Election Details</span>
          <button data-close type="button" onClick={() => setEditForm(null)} className="modal-close-btn">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {editForm && (
          <form onSubmit={handleDetailsSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
            <div className="modal-body flex flex-col flex-1 min-h-0 overflow-y-auto w-full">
              <Input label="Title" placeholder="e.g. BUCC 2026 Executive" required value={editForm.title} onChange={(e: CE<HTMLInputElement>) => setEditForm((ef) => ef && { ...ef, title: e.target.value })} />
              <Input label="Description" type="textarea" placeholder="Brief description..." value={editForm.desc} onChange={(e: CE<HTMLTextAreaElement>) => setEditForm((ef) => ef && { ...ef, desc: e.target.value })} rows={3} />
              <Input isWrapper label="Association Logo" fieldClassName="file-input w-full">
                <label className="file-drag-area flex flex-col items-center justify-center text-center cursor-pointer w-full gap-2 py-4">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      f && setEditForm((ef) => ef && { ...ef, logoFile: f, logoPreview: URL.createObjectURL(f), removeLogo: false });
                      e.target.value = "";
                    }}
                  />
                  {editForm.logoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <Avatar src={editForm.logoPreview} name={editForm.title} size="xl" radius="md" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary font-medium">Click to change</span>
                        <span className="text-xs text-text-secondary">•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditForm((ef) => ef && { ...ef, logoFile: null, logoPreview: "", removeLogo: true });
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold text-text-primary">Click to upload logo</span>
                      <span className="text-xs text-text-secondary">PNG, JPG or SVG up to 5MB</span>
                    </div>
                  )}
                </label>
              </Input>
              <Input label="Department" type="select" defaultValue={editForm.deptId} onChange={(e: CE<HTMLSelectElement>) => setEditForm((ef) => ef && { ...ef, deptId: e.target.value })} options={[{ value: "", option: "Select Department" }, ...DEPARTMENTS.map((d) => ({ value: d.id, option: d.name }))]} />
              <div className="grid gap-x-4 gap-y-0 sm:grid-cols-2 w-full">
                <Input label="Start Date" type="datetime-local" value={editForm.startDate} onChange={(e: CE<HTMLInputElement>) => setEditForm((ef) => ef && { ...ef, startDate: e.target.value })} />
                <Input label="End Date" type="datetime-local" value={editForm.endDate} onChange={(e: CE<HTMLInputElement>) => setEditForm((ef) => ef && { ...ef, endDate: e.target.value })} />
              </div>
              <Input label="Unopposed minimum winning percentage (optional)" type="number" placeholder="e.g. 50" min={0.01} max={100} step="any" value={editForm.minWinnerPct} onChange={(e: CE<HTMLInputElement>) => setEditForm((ef) => ef && { ...ef, minWinnerPct: e.target.value })} helperText={{ info: "Share of a position's ballots, abstentions included, an unopposed candidate needs to win." }} />
            </div>
            <div className="modal-footer flex items-center justify-end gap-3 shrink-0 w-full">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditForm(null)}>
                Cancel
              </Button>
              <Button variant="stamp" size="sm" type="submit" disabled={saving || !editForm.title.trim() || !editForm.deptId}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogModal>
      <Footer className="admin-footer" />
    </div>
  );
};

export default AdminElectionDetail;
