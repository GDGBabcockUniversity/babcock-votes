"use client";
import React from "react";
import clsx from "clsx";
import CheckIcon from "@icons/common/check.svg";
import "@/styles/ballot/steps.css";

export interface BallotStepsProps {
  currentStep: 1 | 2 | 3;
  className?: string;
}

const STEPS = [
  { step: 1, label: "Choose" },
  { step: 2, label: "Review" },
  { step: 3, label: "Cast vote" },
] as const;

export const BallotSteps: React.FC<BallotStepsProps> = ({ currentStep, className }) => {
  return (
    <div className={clsx("w-full select-none", className)}>
      <p className="ballot-step-eyebrow md:hidden font-semibold">{`Step ${currentStep} of 3: ${STEPS[currentStep - 1].label}`}</p>
      <nav aria-label="Ballot progress" className="ballot-steps hidden md:flex items-center gap-3">
        {STEPS.map((s, index) => {
          const isDone = currentStep > s.step;
          const isUpcoming = currentStep < s.step;

          return (
            <React.Fragment key={s.step}>
              {index > 0 && <div className={clsx("ballot-step-connector shrink-0", currentStep >= s.step ? "active" : "inactive")} />}
              <div className="ballot-step-item flex items-center shrink-0 gap-2">
                <div className={clsx("ballot-step-marker relative overflow-hidden flex items-center justify-center shrink-0", isDone && "done", currentStep === s.step && "active", isUpcoming && "upcoming")}>{isDone ? <CheckIcon className="ballot-step-icon" /> : <span className="ballot-step-num font-semibold">{s.step}</span>}</div>
                <span className={clsx("ballot-step-label font-semibold whitespace-nowrap", isUpcoming && "upcoming")}>{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

export default BallotSteps;
