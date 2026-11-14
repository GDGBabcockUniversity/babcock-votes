"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import Hero from "../Hero";
import RegisterForm from "./RegisterForm";
import "@/styles/auth/login.css";
import "@/styles/auth/register.css";

const Register: React.FC = () => {
  const { authUser, userProfile, loading, needsEmailConfirmation } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authUser && userProfile && !needsEmailConfirmation) router.replace(PAGES.main.home);
  }, [loading, authUser, userProfile, needsEmailConfirmation, router]);

  if (!loading && authUser && userProfile && !needsEmailConfirmation) return null;

  return (
    <div className="auth-page flex min-h-dvh">
      <Hero />
      <RegisterForm />
    </div>
  );
};

export default Register;
