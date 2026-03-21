"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Header } from "@/components/header";
import { useEffect } from "react";
import { PAGES } from "@/lib/constants";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace(PAGES.auth.login);
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!firebaseUser) return null;

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
};

export default MainLayout;
