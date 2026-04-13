import { create } from "zustand";

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
  connectionLost: boolean;
  setRawInput: (text: string) => void;
  setParagraphs: (paragraphs: Paragraph[]) => void;
  updateParagraph: (id: string, update: Partial<Paragraph>) => void;
  setEngine: (engine: string) => void;
  setTargetLang: (lang: string) => void;
  setMode: (mode: "full" | "lazy") => void;
  setTaskId: (id: string | null) => void;
  setConnectionLost: (lost: boolean) => void;
  reset: () => void;
}

const initialState = {
  rawInput: "",
  paragraphs: [],
  engine: "openai",
  targetLang: "zh-CN",
  mode: "full" as const,
  taskId: null,
  connectionLost: false,
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
  reset: () => set(initialState),
}));
