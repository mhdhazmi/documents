// src/store/pageStreams.ts
import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";

type PageStreamKey = `${Id<"pages">}_${"gemini" | "replicate"}`;

interface PageStreamState {
  chunks: Record<PageStreamKey, string>;
  setChunk: (key: PageStreamKey, txt: string) => void;
}

export const usePageStream = create<PageStreamState>((set) => ({
  chunks: {},
  setChunk: (key, txt) =>
    set((state) => ({ chunks: { ...state.chunks, [key]: txt } })),
}));

// Handy selector for getting text by pageId and source
export const selectChunk = (pageId: Id<"pages">, src: "gemini" | "replicate") =>
  (state: PageStreamState) => state.chunks[`${pageId}_${src}`] ?? "";