import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEPARTMENTS } from "./constants";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const getDepartmentName = (id: string) => {
  return DEPARTMENTS.find((d) => d.id === id)?.name || id;
};

export const getDepartmentId = (name: string) => {
  return DEPARTMENTS.find((d) => d.name === name)?.id || name;
};

/** Replace `/` with `-` for Firestore doc IDs */
export const matricToDocId = (matric: string) =>
  matric.replace(/\//g, "-").toLowerCase();
