export type PostcardCopySize = "short" | "medium" | "long";

export const postcardCopySize = (copy: string): PostcardCopySize => {
  const characterCount = Array.from(copy.replace(/\s/g, "")).length;
  if (characterCount > 160) return "long";
  if (characterCount > 70) return "medium";
  return "short";
};
