"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { User } from "@/lib/types";
import { getDepartmentName } from "@/lib/utils";

const ROLES = ["voter", "dept_admin", "super_admin"] as const;

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  dept_admin: "secondary",
  voter: "outline",
};

const roleLabel: Record<string, string> = {
  voter: "Voter",
  dept_admin: "Dept Admin",
  super_admin: "Super Admin",
};

const UsersPage = () => {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = useState<(User & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(
        query(collection(db, "users"), orderBy("createdAt", "desc")),
      );
      setUsers(
        snap.docs.map(
          (d) => ({ uid: d.id, ...d.data() }) as User & { uid: string },
        ),
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const handleRoleChange = async (uid: string, newRole: string) => {
    setUpdating(uid);
    await updateDoc(doc(db, "users", uid), { role: newRole });
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === uid ? { ...u, role: newRole as User["role"] } : u,
      ),
    );
    setUpdating(null);
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
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="mt-4 border border-border">
        <Table className="font-sans rounded-none">
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
              filtered.map((u) => {
                const isSelf = u.uid === firebaseUser?.uid;
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
                      {isSelf ? (
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
                            <SelectValue className="capitalize" />
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
    </div>
  );
};

export default UsersPage;
