"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { PAGES } from "@/lib/constants";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { authUser, userProfile, loading, needsEmailConfirmation } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authUser) router.replace(!userProfile || needsEmailConfirmation ? PAGES.auth.register : PAGES.main.home);
  }, [authUser, userProfile, loading, needsEmailConfirmation, router]);

  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-page)]">
        <div className="loading-spinner sm" />
      </div>
    );

  if (authUser && userProfile && !needsEmailConfirmation) return null;

  return <main className="min-h-dvh w-full">{children}</main>;
};

export default AuthLayout;
