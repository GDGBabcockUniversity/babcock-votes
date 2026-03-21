"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { DEPARTMENTS, PAGES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["upcoming", "active", "closed"] as const;

const NewElectionPage = () => {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<string>("upcoming");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "elections"), {
        title,
        description,
        departmentId,
        status,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        candidateCount: 0,
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      router.push(PAGES.admin.electionDetail(docRef.id));
    } catch (err) {
      console.error("Failed to create election:", err);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold">Create Election</h1>
      <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-gray font-sans">
        Set up a new election for a department or association.
      </p>

      <Card className="mt-6 rounded-none">
        <CardHeader className="font-sans">
          <CardTitle className="md:text-lg lg:text-xl">Election Details</CardTitle>
          <CardDescription >
            Fill in the information below. You can add positions and candidates
            after creating the election.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="lg:text-lg font-medium">Title</Label>
              <Input
                id="title"
                placeholder="e.g. BUCC 2026 Executive"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="lg:text-lg font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the election..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="lg:text-lg font-medium">Department</Label>
                <Select
                  value={departmentId}
                  onValueChange={(v) => setDepartmentId(v ?? "")}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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

              <div className="space-y-2">
                <Label className="lg:text-lg font-medium">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v ?? "upcoming")}
                >
                  <SelectTrigger>
                    <SelectValue className='capitalize' />
                  </SelectTrigger>
                  <SelectContent className='font-sans'>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="lg:text-lg font-medium">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="lg:text-lg font-medium">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="font-sans rounded-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="font-sans rounded-none">
                {loading ? "Creating..." : "Create Election"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewElectionPage;
