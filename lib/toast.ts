"use client";
import { toaster } from "@t007/toast";

export const toast = toaster(
  {
    position: "bottom-left",
    animation: "slide",
    closeButton: false,
    limit: 7,
  },
  "babcock_votes_toast_"
);

export default toast;
