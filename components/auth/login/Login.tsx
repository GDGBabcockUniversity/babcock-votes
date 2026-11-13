"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import Hero from "../Hero";
import LoginForm from "./LoginForm";
import "@/styles/auth/login.css";

const Login: React.FC = () => {
  const { authUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const needsRegistration = !loading && !!authUser && !userProfile;

  useEffect(() => {
    needsRegistration && router.replace(PAGES.auth.register);
  }, [needsRegistration, router]);

  if (needsRegistration) return null;
  return (
    <div className="auth-page flex min-h-dvh">
      <Hero />
      <LoginForm />
    </div>
  );
};

export default Login;
