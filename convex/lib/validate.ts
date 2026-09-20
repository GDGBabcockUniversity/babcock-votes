import { DEPARTMENTS, LEVELS } from "../../lib/constants";
import { fail } from "./access";

export const text = (value: string, field: string, max = 255) => {
  const trimmed = value.trim();
  if (!trimmed) throw fail(`${field} is required.`);
  if (trimmed.length > max) throw fail(`${field} is too long.`);
  return trimmed;
};

/** Like `text` but an empty string is fine. */
export const optionalText = (value: string, field: string, max = 5000) => {
  const trimmed = value.trim();
  if (trimmed.length > max) throw fail(`${field} is too long.`);
  return trimmed;
};

export const departmentId = (value: string) => {
  if (!DEPARTMENTS.some((d) => d.id === value)) throw fail("Unknown department.");
  return value;
};

export const level = (value: string) => {
  if (!(LEVELS as readonly string[]).includes(value)) throw fail("Unknown level.");
  return value;
};

export const dateRange = (startDate: number, endDate: number) => {
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate)) {
    throw fail("Start and end dates must be valid.");
  }
};
