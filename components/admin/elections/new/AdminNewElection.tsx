"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import toast from "@/lib/toast";
import { useUploadImage } from "@/lib/upload";
import { useAuth } from "@/context/auth-context";
import { DEPARTMENTS, PAGES } from "@/lib/constants";
import Button from "@/components/common/Button";
import Avatar from "@/components/common/Avatar";
import Footer from "@/components/common/Footer";
import { Input, useFormManager, type CE } from "@t007/input/react";
import "@/styles/admin/new-election.css";

const STATUS_OPTIONS: Array<{ value: string; option: string }> = [
  { value: "upcoming", option: "Upcoming" },
  { value: "active", option: "Active" },
  { value: "closed", option: "Closed" },
];

export const AdminNewElection: React.FC = () => {
  const router = useRouter();
  const { authUser } = useAuth();
  const createElection = useMutation(api.elections.create);
  const uploadImage = useUploadImage();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>(DEPARTMENTS[0].id);
  const [status, setStatus] = useState<"upcoming" | "active" | "closed">("upcoming");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minWinnerPercentage, setMinWinnerPercentage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    (setLogoFile(file), setLogoPreview(URL.createObjectURL(file)));
  };

  const handleFormSubmit = async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const logoStorageId = logoFile ? await uploadImage(logoFile) : undefined;
      const id = await createElection({ title: title.trim(), description: description.trim(), departmentId, status, logoStorageId, startDate: new Date(startDate).getTime(), endDate: new Date(endDate).getTime(), minWinnerPercentage: minWinnerPercentage.trim() ? Number(minWinnerPercentage) : undefined });
      toast.success("Election created successfully.");
      router.push(PAGES.admin.electionDetail(id));
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create election. Please try again."));
      setLoading(false);
    }
  };
  const { handleSubmit } = useFormManager(handleFormSubmit);

  return (
    <div className="admin-new-election-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto">
      <div className="flex flex-col gap-1">
        <Link href={PAGES.admin.elections} className="text-sm font-semibold text-text-secondary hover:text-text-primary no-underline mb-2">
          Back to elections
        </Link>
        <h1 className="admin-elections-title font-normal">Create Election</h1>
        <p className="admin-elections-subtitle font-normal">Set up a new election for a department or association.</p>
      </div>
      <form noValidate onSubmit={handleSubmit} className="admin-form-card flex flex-col w-full">
        <Input label="Election title" placeholder="e.g. BUCOSSA Executive Elections 2026" required value={title} onChange={(e: CE<HTMLInputElement>) => setTitle(e.target.value)} />
        <Input type="textarea" label="Description" placeholder="A brief description of this election and what students are voting for." value={description} onChange={(e: CE<HTMLTextAreaElement>) => setDescription(e.target.value)} rows={3} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <Input type="select" label="Department" defaultValue={departmentId} onChange={(e: CE<HTMLSelectElement>) => setDepartmentId(e.target.value)} options={DEPARTMENTS.map((d) => ({ value: d.id, option: d.name }))} required />
          <Input type="select" label="Status" defaultValue={status} onChange={(e: CE<HTMLSelectElement>) => setStatus(e.target.value as "upcoming" | "active" | "closed")} options={STATUS_OPTIONS} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <Input type="datetime-local" label="Start date & time" required value={startDate} onChange={(e: CE<HTMLInputElement>) => setStartDate(e.target.value)} />
          <Input type="datetime-local" label="End date & time" required value={endDate} onChange={(e: CE<HTMLInputElement>) => setEndDate(e.target.value)} />
        </div>
        <Input type="number" label="Minimum winner percentage (optional)" placeholder="Optional, e.g. 50" min={1} max={100} value={minWinnerPercentage} onChange={(e: CE<HTMLInputElement>) => setMinWinnerPercentage(e.target.value)} />
        <Input isWrapper label="Election logo / banner (optional)" fieldClassName="file-input w-full">
          <label className="file-drag-area flex flex-col items-center justify-center gap-2 text-center w-full cursor-pointer py-4">
            <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            {logoPreview ? (
              <div className="flex flex-col items-center gap-2">
                <Avatar src={logoPreview} name={title} size="xl" radius="md" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-medium">Click to change</span>
                  <span className="text-xs text-text-secondary">•</span>
                  <button type="button" onClick={(e) => (e.preventDefault(), e.stopPropagation(), setLogoFile(null), setLogoPreview(""))} className="text-xs text-red-500 hover:text-red-600 font-medium">
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
          <Link href={PAGES.admin.elections} className="text-sm font-semibold text-text-secondary hover:text-text-primary no-underline px-4 py-2">
            Cancel
          </Link>
          <Button variant="stamp" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Election"}
          </Button>
        </div>
      </form>
      <Footer className="admin-footer" />
    </div>
  );
};

export default AdminNewElection;
