"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Returns a function that uploads an image straight to Convex file storage
 * (admins only; the upload URL comes from `files.generateUploadUrl`) and
 * resolves to the `storageId` to save on the election or candidate.
 */
export const useUploadImage = () => {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  return async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Image upload failed. Please try again.");

    const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };
};
