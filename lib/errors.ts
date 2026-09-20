import { ConvexError } from "convex/values";

/** Readable message from a failed Convex call (our `ConvexError`s carry one; anything else gets the fallback). */
export const errorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) =>
  error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
