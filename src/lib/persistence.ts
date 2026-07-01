import localforage from "localforage";

const DRAFT_KEY = "henosis_unified_draft_session";

export interface DraftState {
  activeImportTab: "file" | "text" | "json" | "manual";
  deckTitle: string;
  deckSubject: string;
  isAddToExisting: boolean;
  selectedExistingDeckId: string;

  // AI Pipeline (File/Text/Json unified progress)
  activeSession: any;
  extractedCards: any[];

  // Manual Pipeline
  manualFront: string;
  manualWordForm: string;
  manualBack: string;
  manualBatch: any[];

  // Input states
  jsonPasteInput: string;
  rawTextarea: string;
  file: File | Blob | null;
  uploadedFileName: string;

  logs: any[];
  
  createdAt: number;
  updatedAt: number;
}

export const PersistenceService = {
  async saveDraft(state: Partial<DraftState>) {
    const current = await this.restoreDrafts();
    const payload = {
      ...current,
      ...state,
      createdAt: current?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await localforage.setItem(DRAFT_KEY, payload);
    } catch (err) {
      console.warn("Storage quota exceeded in persistence service", err);
    }
  },
  
  async updateDraft(state: Partial<DraftState>) {
    return this.saveDraft(state);
  },

  async restoreDrafts(): Promise<DraftState | null> {
    try {
      const parsed = await localforage.getItem<DraftState>(DRAFT_KEY);
      if (parsed && parsed.updatedAt && Date.now() - parsed.updatedAt > 24 * 60 * 60 * 1050) {
        await this.clearDraft();
        return null;
      }
      return parsed || null;
    } catch (err) {
      console.error("Failed to restore draft:", err);
      return null;
    }
  },

  async deleteDraft() {
    await this.clearDraft();
  },

  async clearDraft() {
    await localforage.removeItem(DRAFT_KEY);
  }
};

