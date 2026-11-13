"use client";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { getDepartmentName } from "@/lib/utils";
import InfoIcon from "@icons/common/info.svg";
import Bone from "@/components/common/skeleton/Bone";
import Avatar from "@/components/common/Avatar";
import Chip from "@/components/common/Chip";
import Footer from "@/components/common/Footer";
import "@/styles/profile/profile.css";

export const Profile: React.FC = () => {
  const { userProfile, loading } = useAuth();
  const elections = useQuery(api.elections.list, {});
  const activeElection = elections?.find((e) => e.departmentId === userProfile?.departmentId) ?? elections?.[0] ?? null;
  const receipt = useQuery(api.votes.getReceipt, activeElection ? { electionId: activeElection.id } : "skip");
  const deptName = getDepartmentName(userProfile?.departmentId || "");

  return (
    <div className="profile-page flex flex-col flex-1 w-full gap-6 lg:gap-8">
      <div className="profile-intro flex flex-col w-full gap-3">
        <h1 className="profile-title font-normal flex items-center gap-2">
          Hello, {loading ? <Bone className="w-36 sm:w-48 h-8 sm:h-9 rounded-md inline-block align-middle" /> : `${(userProfile?.fullName ? userProfile.fullName.trim().split(/\s+/)[0] : "Voter")}.`}
        </h1>
        <p className="profile-subtitle font-normal">Your registration details for this election.</p>
      </div>
      <div className="profile-sections flex items-stretch w-full gap-6">
        <div className="profile-identity-card flex flex-col items-center w-full gap-3">
          <Avatar src={userProfile?.image} name={userProfile?.fullName} size="xl" />
          {loading ? <Bone className="w-36 h-7" /> : <h2 className="profile-name text-center font-normal">{userProfile?.fullName ?? "Voter"}</h2>}
          <div className="flex flex-col items-center gap-0.5">
            {loading ? <Bone className="w-28 h-4" /> : <p className="profile-dept text-center font-normal">{deptName}</p>}
            {loading ? <Bone className="w-16 h-3.5 mt-0.5" /> : userProfile?.level ? <p className="profile-level text-center font-normal">{userProfile.level} Level</p> : null}
          </div>
          {loading || receipt === undefined ? <Bone className="w-24 h-6 rounded-full" /> : <Chip text={!!receipt ? "Voted" : "Eligible to vote"} tone="ok" />}
        </div>
        <div className="profile-details-card flex flex-col flex-1 min-w-0 gap-2">
          <h3 className="profile-details-title font-normal">Registration details</h3>
          <div className="profile-row flex items-center justify-between gap-4 w-full">
            <span className="profile-row-label font-normal shrink-0">Full name</span>
            <span className="profile-row-val font-semibold text-right break-words">{loading ? <Bone className="w-36 h-4 ml-auto" /> : userProfile?.fullName || "—"}</span>
          </div>
          <div className="profile-row flex items-center justify-between gap-4 w-full">
            <span className="profile-row-label font-normal shrink-0">Matric number</span>
            <span className="profile-row-val font-medium text-right">{loading ? <Bone className="w-24 h-4 ml-auto" /> : userProfile?.matricNumber || "—"}</span>
          </div>
          <div className="profile-row flex items-center justify-between gap-4 w-full">
            <span className="profile-row-label font-normal shrink-0">Department</span>
            <span className="profile-row-val font-semibold text-right">{loading ? <Bone className="w-32 h-4 ml-auto" /> : deptName || "—"}</span>
          </div>
          <div className="profile-row flex items-center justify-between gap-4 w-full">
            <span className="profile-row-label font-normal shrink-0">Voter status</span>
            <span className="profile-row-val font-semibold text-right">
              {loading || receipt === undefined ? (
                <Bone className="w-28 h-4 ml-auto" />
              ) : receipt?.votedAt ? (
                `Voted on ${new Date(receipt.votedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              ) : (
                "Eligible to vote"
              )}
            </span>
          </div>
          <div className="profile-row flex items-center justify-between gap-4 w-full">
            <span className="profile-row-label font-normal shrink-0">Registration date</span>
            <span className="profile-row-val font-medium text-right">{loading ? <Bone className="w-24 h-4 ml-auto" /> : userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Active"}</span>
          </div>
        </div>
      </div>
      <div className="profile-help flex items-start w-full gap-3">
        <span className="profile-help-icon flex items-center justify-center shrink-0" aria-hidden="true">
          <InfoIcon className="w-full h-full" />
        </span>
        <p className="font-normal">Something wrong with your details? Contact the electoral committee before voting closes.</p>
      </div>
      <Footer className="profile-footer" />
    </div>
  );
};

export default Profile;
