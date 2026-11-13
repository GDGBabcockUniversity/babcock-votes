import React from "react";
import Image from "next/image";
import BallotIcon from "@icons/common/ballot.svg";
import LockIcon from "@icons/common/lock.svg";
import UserIcon from "@icons/common/user.svg";
import CheckIcon from "@icons/common/check.svg";

const Hero: React.FC = () => (
  <aside className="auth-hero relative flex-1 overflow-hidden hidden lg:flex flex-col justify-between min-h-dvh">
    <div className="auth-brand relative z-[2] flex items-center gap-2.5">
      <BallotIcon className="auth-brand-logo shrink-0" aria-hidden />
      <span className="auth-brand-title font-normal whitespace-nowrap">Babcock Votes</span>
    </div>
    <div className="auth-thumbprint-wrapper absolute pointer-events-none opacity-85" aria-hidden="true">
      <Image src="/images/auth/thumbprint.svg" alt="" width={560} height={560} className="auth-thumbprint-art rotate-[14deg]" priority />
    </div>
    <div className="auth-hero-content relative z-[2] flex flex-col gap-5 mt-auto">
      <h1 className="auth-hero-headline font-normal">
        Every vote
        <br />
        leaves a mark.
      </h1>
      <p className="auth-hero-desc">Sign in with your student account to see who’s running and cast your vote. Your choices stay private.</p>
    </div>
    <div className="auth-principles relative z-[2] flex flex-row flex-wrap items-center gap-6">
      <div className="auth-principle-item flex items-center gap-2">
        <LockIcon className="auth-principle-icon shrink-0" aria-hidden />
        <span className="auth-principle-text font-semibold whitespace-nowrap">Secret ballot</span>
      </div>
      <div className="auth-principle-item flex items-center gap-2">
        <UserIcon className="auth-principle-icon shrink-0" aria-hidden />
        <span className="auth-principle-text font-semibold whitespace-nowrap">One student, one vote</span>
      </div>
      <div className="auth-principle-item flex items-center gap-2">
        <CheckIcon className="auth-principle-icon shrink-0" aria-hidden />
        <span className="auth-principle-text font-semibold whitespace-nowrap">Final once cast</span>
      </div>
    </div>
  </aside>
);

export default Hero;
