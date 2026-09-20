/**
 * Shared setup for the maintenance scripts.
 *
 * Reads NEXT_PUBLIC_CONVEX_URL and OPS_SECRET from .env.local (falling back to
 * .env). Scripts talk to the deployment through the secret-guarded functions in
 * convex/ops.ts, so point NEXT_PUBLIC_CONVEX_URL at the deployment you mean to
 * change (dev vs prod) and set the same OPS_SECRET there.
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

config({ path: [".env.local", ".env"], quiet: true });

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local (see README).`);
    process.exit(1);
  }
  return value;
};

export const CONVEX_URL = required("NEXT_PUBLIC_CONVEX_URL");
export const SECRET = required("OPS_SECRET");

export const client = new ConvexHttpClient(CONVEX_URL);
export const api = anyApi;

/** Call an `ops:*` mutation with the secret filled in. */
export const ops = {
  mutation: (name, args = {}) => client.mutation(api.ops[name], { secret: SECRET, ...args }),
  query: (name, args = {}) => client.query(api.ops[name], { secret: SECRET, ...args }),
  action: (name, args = {}) => client.action(api.ops[name], { secret: SECRET, ...args }),
};

/** Same normalisation the app uses for eligible-voter keys. */
export const matricToDocId = (matric) => matric.replace(/\//g, "-").toLowerCase();

/** Split into fixed-size chunks (Convex mutations are limited in size and time). */
export const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Minimal CSV parser for the seed scripts (handles quoted fields). */
export const parseCsvLine = (line) => {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
};

/** Read a CSV file into row objects keyed by its header, checking required columns. */
export const readCsv = async (path, requiredColumns) => {
  const { readFileSync } = await import("fs");
  const { resolve } = await import("path");
  const lines = readFileSync(resolve(path), "utf-8").trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);

  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      console.error(`Missing required column: "${col}". Found: ${header.join(", ")}`);
      process.exit(1);
    }
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((col, i) => [col, values[i] || ""]));
  });
};
