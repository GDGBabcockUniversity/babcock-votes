"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Header } from "@/components/header";
import { useEffect } from "react";
import { PAGES } from "@/lib/constants";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { authUser, userProfile, loading, needsEmailConfirmation } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authUser) {
      router.replace(PAGES.auth.login);
    }
    if (!loading && authUser && (!userProfile || needsEmailConfirmation)) {
      router.replace(PAGES.auth.register);
    }
  }, [authUser, userProfile, loading, needsEmailConfirmation, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!authUser || !userProfile || needsEmailConfirmation) return null;

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pt-6">{children}</main>
    </div>
  );
};

export default MainLayout;
