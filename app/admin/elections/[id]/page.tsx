"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Upload,
  BarChart3,
} from "lucide-react";
import type { Election, Position, Candidate } from "@/lib/types";
import Image from "next/image";

const ElectionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === "super_admin";

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Position form state
  const [posTitle, setPosTitle] = useState("");
  const [posDesc, setPosDesc] = useState("");
  const [posOrder, setPosOrder] = useState(0);
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [posDialogOpen, setPosDialogOpen] = useState(false);

  // Candidate form state
  const [candName, setCandName] = useState("");
  const [candManifesto, setCandManifesto] = useState("");
  const [candDept, setCandDept] = useState("");
  const [candLevel, setCandLevel] = useState("");
  const [candPositionId, setCandPositionId] = useState("");
  const [candPhoto, setCandPhoto] = useState<File | null>(null);
  const [candPhotoPreview, setCandPhotoPreview] = useState("");
  const [editingCandId, setEditingCandId] = useState<string | null>(null);
  const [candDialogOpen, setCandDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Status editing
  const [statusValue, setStatusValue] = useState<string>("");

  const elRef = doc(db, "elections", id);

  const fetchData = async () => {
    const elSnap = await getDoc(elRef);
    if (!elSnap.exists()) return;

    const elData = { id: elSnap.id, ...elSnap.data() } as Election;
    setElection(elData);
    setStatusValue(elData.status);

    const [posSnap, candSnap] = await Promise.all([
      getDocs(query(collection(elRef, "positions"), orderBy("order", "asc"))),
      getDocs(collection(elRef, "candidates")),
    ]);

    setPositions(
      posSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Position),
    );
    setCandidates(
      candSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Candidate),
    );
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "elections", id);
      const elSnap = await getDoc(ref);
      if (!elSnap.exists()) {
        setLoading(false);
        return;
      }

      const elData = { id: elSnap.id, ...elSnap.data() } as Election;
      setElection(elData);
      setStatusValue(elData.status);

      const [posSnap, candSnap] = await Promise.all([
        getDocs(query(collection(ref, "positions"), orderBy("order", "asc"))),
        getDocs(collection(ref, "candidates")),
      ]);

      setPositions(
        posSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Position),
      );
      setCandidates(
        candSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Candidate),
      );
      setLoading(false);
    };
    load();
  }, [id]);

  // --- Position CRUD ---
  const resetPosForm = () => {
    setPosTitle("");
    setPosDesc("");
    setPosOrder(positions.length);
    setEditingPosId(null);
  };

  const openEditPos = (pos: Position) => {
    setPosTitle(pos.title);
    setPosDesc(pos.description);
    setPosOrder(pos.order);
    setEditingPosId(pos.id);
    setPosDialogOpen(true);
  };

  const handleSavePosition = async () => {
    setSaving(true);
    const data = { title: posTitle, description: posDesc, order: posOrder };

    if (editingPosId) {
      await updateDoc(doc(elRef, "positions", editingPosId), data);
    } else {
      await addDoc(collection(elRef, "positions"), data);
    }

    resetPosForm();
    setPosDialogOpen(false);
    setSaving(false);
    fetchData();
  };

  const handleDeletePosition = async (posId: string) => {
    if (!confirm("Delete this position and all its candidates?")) return;
    await deleteDoc(doc(elRef, "positions", posId));
    const relatedCands = candidates.filter((c) => c.positionId === posId);
    await Promise.all(
      relatedCands.map((c) => deleteDoc(doc(elRef, "candidates", c.id))),
    );
    fetchData();
  };

  // --- Candidate CRUD ---
  const resetCandForm = () => {
    setCandName("");
    setCandManifesto("");
    setCandDept("");
    setCandLevel("");
    setCandPositionId("");
    setCandPhoto(null);
    setCandPhotoPreview("");
    setEditingCandId(null);
  };

  const openEditCand = (cand: Candidate) => {
    setCandName(cand.fullName);
    setCandManifesto(cand.manifesto);
    setCandDept(cand.department);
    setCandLevel(cand.level);
    setCandPositionId(cand.positionId);
    setCandPhotoPreview(cand.photoUrl || "");
    setCandPhoto(null);
    setEditingCandId(cand.id);
    setCandDialogOpen(true);
  };

  const openAddCandForPosition = (posId: string) => {
    resetCandForm();
    setCandPositionId(posId);
    setCandDialogOpen(true);
  };

  const handleSaveCandidate = async () => {
    setSaving(true);

    let photoUrl = candPhotoPreview;
    if (candPhoto) {
      const storageRef = ref(
        storage,
        `candidates/${id}/${Date.now()}_${candPhoto.name}`,
      );
      await uploadBytes(storageRef, candPhoto);
      photoUrl = await getDownloadURL(storageRef);
    }

    const data = {
      fullName: candName,
      manifesto: candManifesto,
      department: candDept,
      level: candLevel,
      positionId: candPositionId,
      photoUrl,
    };

    if (editingCandId) {
      await updateDoc(doc(elRef, "candidates", editingCandId), data);
    } else {
      await addDoc(collection(elRef, "candidates"), {
        ...data,
        voteCount: 0,
      });
      await updateDoc(elRef, {
        candidateCount: (election?.candidateCount ?? 0) + 1,
      });
    }

    resetCandForm();
    setCandDialogOpen(false);
    setSaving(false);
    fetchData();
  };

  const handleDeleteCandidate = async (candId: string) => {
    if (!confirm("Delete this candidate?")) return;
    await deleteDoc(doc(elRef, "candidates", candId));
    await updateDoc(elRef, {
      candidateCount: Math.max((election?.candidateCount ?? 1) - 1, 0),
    });
    fetchData();
  };

  // --- Status change ---
  const handleStatusChange = async (newStatus: string) => {
    setStatusValue(newStatus);
    await updateDoc(elRef, { status: newStatus });
    setElection((prev) =>
      prev ? { ...prev, status: newStatus as Election["status"] } : prev,
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandPhoto(file);
    setCandPhotoPreview(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center text-sm text-muted-gray font-sans">
        Election not found.
      </p>
    );
  }

  const grouped = positions.map((pos) => ({
    position: pos,
    candidates: candidates.filter((c) => c.positionId === pos.id),
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/admin/elections")}
            className="mb-2 flex items-center gap-1 text-xs md:text-sm text-muted-gray hover:text-charcoal font-sans"
          >
            <ArrowLeft className="size-3.5 md:size-4" /> Back to Elections
          </button>
          <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold italic my-4">{election.title}</h1>
          <p className="mt-1 text-sm md:text-base text-muted-gray font-sans">
            {election.department} <span className="text-muted-gray/40">&#8226;</span> {candidates.length} cand{candidates.length === 1 ? "idate" : "idates"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/elections/${id}/results`}
            className={cn(
              "font-sans rounded-none",
              "flex w-full items-center justify-center border border-input bg-background px-3 py-2 text-xs md:text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <BarChart3 className="mr-2 size-3.5" /> Results
          </Link>
          {isSuperAdmin && (
            <Select value={statusValue} onValueChange={(v) => v && handleStatusChange(v)}>
              <SelectTrigger className="w-32">
                <SelectValue className="capitalize" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                {(["upcoming", "active", "closed"] as const).map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isSuperAdmin && (
            <Badge variant={statusValue === "active" ? "default" : "secondary"}>
              {statusValue}
            </Badge>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Positions + Candidates */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl md:text-2xl font-semibold">
          Positions & Candidates
        </h2>
        {isSuperAdmin && (
          <Dialog open={posDialogOpen} onOpenChange={(o) => { setPosDialogOpen(o); if (!o) resetPosForm(); }}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" className="font-sans rounded-none">
                  <Plus className="mr-2 size-3.5" /> Add Position
                </Button>
              }
            />
            <DialogContent className="font-sans rounded-none p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingPosId ? "Edit Position" : "Add Position"}
                </DialogTitle>
                <DialogDescription>
                  Define a role voters will cast a ballot for.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. President"
                    value={posTitle}
                    onChange={(e) => setPosTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description..."
                    value={posDesc}
                    onChange={(e) => setPosDesc(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={posOrder}
                    onChange={(e) => setPosOrder(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose
                  render={<Button variant="outline" className="font-sans rounded-none">Cancel</Button>}
                />
                <Button onClick={handleSavePosition} disabled={saving || !posTitle} className="font-sans rounded-none">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-4 space-y-6">
        {grouped.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-gray font-sans">
            No positions yet. Add one to get started.
          </p>
        )}

        {grouped.map(({ position, candidates: cands }) => (
          <Card key={position.id} className="font-sans rounded-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-serif md:text-xl lg:text-2xl font-semibold">{position.title}</CardTitle>
                {position.description && (
                  <CardDescription>{position.description}</CardDescription>
                )}
              </div>
              {isSuperAdmin && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => openEditPos(position)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDeletePosition(position.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cands.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 border border-border p-3"
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {c.photoUrl ? (
                        <Image
                          src={c.photoUrl}
                          alt={c.fullName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-sm font-bold text-muted-gray">
                          {c.fullName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-gray">
                        {c.department} &middot; {c.level}L
                      </p>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => openEditCand(c)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCandidate(c.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 font-sans rounded-none"
                  onClick={() => openAddCandForPosition(position.id)}
                >
                  <Plus className="mr-1 size-3.5" /> Add Candidate
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Dialog */}
      <Dialog open={candDialogOpen} onOpenChange={(o) => { setCandDialogOpen(o); if (!o) resetCandForm(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto font-sans rounded-none p-6">
          <DialogHeader>
            <DialogTitle>
              {editingCandId ? "Edit Candidate" : "Add Candidate"}
            </DialogTitle>
            <DialogDescription>
              {positions.find((p) => p.id === candPositionId)?.title ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={candName}
                onChange={(e) => setCandName(e.target.value)}
                placeholder="Candidate name"
              />
            </div>

            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-4">
                {candPhotoPreview && (
                  <div className="relative size-16 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={candPhotoPreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 border border-dashed border-border px-4 py-2 text-sm text-muted-gray hover:border-gold hover:text-charcoal">
                  <Upload className="size-4" />
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Manifesto</Label>
              <Textarea
                value={candManifesto}
                onChange={(e) => setCandManifesto(e.target.value)}
                placeholder="Candidate's manifesto or bio..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={candDept} onValueChange={(v) => setCandDept(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="font-sans w-full">
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={candLevel} onValueChange={(v) => setCandLevel(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="font-sans w-full">
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" className="rounded-none">Cancel</Button>}
            />
            <Button
              onClick={handleSaveCandidate}
              disabled={saving || !candName || !candPositionId}
              className="rounded-none"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectionDetailPage;
