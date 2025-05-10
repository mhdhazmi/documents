// src/store/pageStreams.ts
import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";

type PageStreamKey = `${Id<"pages">}_${"gemini" | "replicate"}`;
type InFlightKey = `${Id<"pages">}_${"gemini" | "replicate"}`;

interface PageStreamState {
  chunks: Record<PageStreamKey, string>;
  inFlight: Set<InFlightKey>;
  setChunk: (key: PageStreamKey, txt: string) => void;
  markInFlight: (key: InFlightKey) => void;
  clearInFlight: (key: InFlightKey) => void;
}

export const usePageStream = create<PageStreamState>((set) => ({
  chunks: {},
  inFlight: new Set(),
  setChunk: (key, txt) =>
    set((state) => ({ chunks: { ...state.chunks, [key]: txt } })),
  markInFlight: (key) =>
    set((state) => ({ inFlight: new Set([...state.inFlight, key]) })),
  clearInFlight: (key) =>
    set((state) => {
      const newSet = new Set(state.inFlight);
      newSet.delete(key);
      return { inFlight: newSet };
    }),
}));

// Handy selector for getting text by pageId and source
export const selectChunk = (pageId: Id<"pages">, src: "gemini" | "replicate") =>
  (state: PageStreamState) => state.chunks[`${pageId}_${src}`] ?? "";