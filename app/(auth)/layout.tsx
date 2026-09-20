"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { PAGES } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { authUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authUser && userProfile) {
      router.replace(PAGES.main.home);
    }
  }, [authUser, userProfile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (authUser && userProfile) return null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
};

export default AuthLayout;
