"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Menu } from "lucide-react";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.replace("/login");
      } else if (
        userProfile &&
        userProfile.role !== "super_admin" &&
        userProfile.role !== "dept_admin"
      ) {
        router.replace("/");
      }
    }
  }, [firebaseUser, userProfile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (
    !firebaseUser ||
    !userProfile ||
    (userProfile.role !== "super_admin" && userProfile.role !== "dept_admin")
  ) {
    return null;
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5" />
          </button>
          <span className="ml-3 text-sm lg:text-base font-bold uppercase tracking-widest font-sans">
            Admin
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
