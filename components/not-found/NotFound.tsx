"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import BallotIcon from "@icons/common/ballot.svg";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ButtonLink } from "@/components/common/Button";
import { PAGES } from "@/lib/constants";
import "@/styles/not-found/not-found.css";

export const NotFound: React.FC<{ isDashboard?: boolean }> = ({ isDashboard = false }) => {
  return (
    <div className={isDashboard ? "flex flex-col flex-1 items-center justify-center w-full py-12" : "not-found-page flex flex-col justify-between w-full overflow-hidden"}>
      {!isDashboard && (
        <header className="not-found-header flex items-center justify-between w-full">
          <Link href={PAGES.main.home} className="not-found-brand flex items-center no-underline gap-2.5">
            <span className="not-found-brand-logo flex items-center justify-center shrink-0" aria-hidden="true">
              <BallotIcon className="w-full h-full" />
            </span>
            <span className="not-found-brand-title whitespace-nowrap">Babcock Votes</span>
          </Link>
          <ThemeToggle />
        </header>
      )}
      <main className="not-found-center relative flex flex-col items-center justify-center w-full text-center m-auto">
        <div className="not-found-thumbprint-wrapper absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[-14deg] pointer-events-none opacity-30" aria-hidden="true">
          <Image src="/images/auth/thumbprint.svg" alt="" width={560} height={560} className="w-full h-full object-contain" priority />
        </div>
        <div className="not-found-content relative flex flex-col items-center gap-5">
          <div className="not-found-code select-none flex items-center justify-center">
            <span>4</span>
            <span className="inline-block scale-125 origin-center mx-[0.08em]">0</span>
            <span>4</span>
          </div>
          <h1 className="not-found-headline">This page left no mark.</h1>
          <p className="not-found-desc mx-auto">The ballot, association, or page you were looking for doesn&rsquo;t exist, was moved, or has ended.</p>
          <div className="not-found-actions flex items-center justify-center max-sm:flex-col w-full gap-3.5">
            <ButtonLink href={PAGES.main.home} variant="stamp">
              Return to Home
            </ButtonLink>
            <ButtonLink href={PAGES.main.elections} variant="secondary">
              Browse Elections
            </ButtonLink>
          </div>
        </div>
      </main>
      {!isDashboard && (
        <footer className="not-found-footer flex items-center justify-center w-full">
          <span>&copy; Babcock University Student Association</span>
        </footer>
      )}
    </div>
  );
};

export default NotFound;
