/** Replace `/` with `-` and lowercase: the lookup key for an eligible voter's matric number. */
export const matricToDocId = (matric: string) =>
  matric.replace(/\//g, "-").toLowerCase();

/** Inverse for display: "pt-22-2222" -> "PT/22/2222". */
export const matricFromDocId = (key: string) =>
  key.replace(/-/g, "/").toUpperCase();
