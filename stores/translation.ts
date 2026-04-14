import { create } from "zustand";
import { useAppSettingsStore } from "@/stores/app-settings";

export interface Paragraph {
  id: string;
  type:
    | "heading"
    | "paragraph"
    | "code"
    | "table"
    | "list"
    | "blockquote"
    | "mermaid";
  original: string;
  translated: string;
  status: "idle" | "translating" | "done" | "error" | "edited" | "queued";
  errorMessage?: string;
}

interface TranslationStore {
  rawInput: string;
  paragraphs: Paragraph[];
  engine: string;
  targetLang: string;
  mode: "full" | "lazy";
  taskId: string | null;
  activeRequestId: string | null;
  connectionLost: boolean;
  abortController: AbortController | null;
  setRawInput: (text: string) => void;
  setParagraphs: (paragraphs: Paragraph[]) => void;
  updateParagraph: (id: string, update: Partial<Paragraph>) => void;
  setEngine: (engine: string) => void;
  setTargetLang: (lang: string) => void;
  setMode: (mode: "full" | "lazy") => void;
  setTaskId: (id: string | null) => void;
  setConnectionLost: (lost: boolean) => void;
  beginTranslationRun: (requestId: string, controller: AbortController) => void;
  finishTranslationRun: (requestId: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  cancelTranslation: () => void;
  reset: () => void;
}

const initialState = {
  rawInput: "",
  paragraphs: [],
  engine: "openai",
  targetLang: "zh-CN",
  mode: "full" as const,
  taskId: null,
  activeRequestId: null,
  connectionLost: false,
  abortController: null,
};

export const useTranslationStore = create<TranslationStore>((set) => ({
  ...initialState,
  setRawInput: (rawInput) => set({ rawInput }),
  setParagraphs: (paragraphs) => set({ paragraphs }),
  updateParagraph: (id, update) =>
    set((state) => ({
      paragraphs: state.paragraphs.map((paragraph) =>
        paragraph.id === id ? { ...paragraph, ...update } : paragraph
      ),
    })),
  setEngine: (engine) => set({ engine }),
  setTargetLang: (targetLang) => set({ targetLang }),
  setMode: (mode) => set({ mode }),
  setTaskId: (taskId) => set({ taskId }),
  setConnectionLost: (connectionLost) => set({ connectionLost }),
  beginTranslationRun: (activeRequestId, abortController) =>
    set((state) => {
      state.abortController?.abort();
      return {
        activeRequestId,
        abortController,
        connectionLost: false,
      };
    }),
  finishTranslationRun: (requestId) =>
    set((state) =>
      state.activeRequestId === requestId
        ? {
            activeRequestId: null,
            abortController: null,
          }
        : {}
    ),
  setAbortController: (abortController) => set({ abortController }),
  cancelTranslation: () =>
    set((state) => {
      state.abortController?.abort();
      return {
        activeRequestId: null,
        abortController: null,
      };
    }),
  reset: () =>
    set(() => ({
      ...initialState,
      targetLang: useAppSettingsStore.getState().defaultTargetLang,
    })),
}));
