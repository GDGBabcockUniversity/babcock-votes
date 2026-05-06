import type { Election, User } from "@/lib/types";

const isAdmin = (role?: User["role"]) =>
  role === "super_admin" || role === "dept_admin";

export const canViewDuplicateElection = (
  election: Election,
  userProfile: User | null,
) => {
  if (!election.isDuplicate) return true;

  if (!isAdmin(userProfile?.role)) return false;
  if (userProfile?.role === "super_admin") return true;

  return election.departmentId === userProfile?.departmentId;
};

export const filterVisibleElections = (
  elections: Election[],
  userProfile: User | null,
) =>
  elections.filter((election) =>
    canViewDuplicateElection(election, userProfile),
  );
