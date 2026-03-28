import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Workspace, Translation, NerSpan, Segment } from '../../types';
import { populateSegmentText } from '../../types';


const areSpansEqual = (a: NerSpan[], b: NerSpan[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((s, i) =>
    s.start === b[i].start &&
    s.end === b[i].end &&
    s.entity === b[i].entity &&
    s.id === b[i].id &&
    s.origin === b[i].origin
  );
};

const areSegmentsEqual = (a: Segment[], b: Segment[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((s, i) =>
    s.id === b[i].id &&
    s.start === b[i].start &&
    s.end === b[i].end &&
    s.text === b[i].text &&
    s.order === b[i].order &&
    s.isEdited === b[i].isEdited
  );
};

const areTranslationsEqual = (a: Translation[], b: Translation[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((t, i) =>
    t.language === b[i].language &&
    t.text === b[i].text &&
    t.updatedAt === b[i].updatedAt
  );
};

interface SessionStore {
  session: Workspace | null;      
  draftText: string;              
  activeTab: string;
  
  activeSegmentId: string | undefined;
  
  
  isDirty: boolean;
  lastChangedAt: number;
  
  loadSession: (workspace: Workspace) => void;
  resetSession: () => void;
  setLoading: () => void;


 

  isTagPanelOpen: boolean;
  setTagPanelOpen: (isOpen: boolean) => void;

  setDraftText: (text: string) => void;
  updateUserSpans: (spans: NerSpan[]) => void;
  updateApiSpans: (spans: NerSpan[]) => void;
  updateDeletedApiKeys: (keys: string[]) => void;
  updateSegments: (segments: Segment[]) => void;
  updateTranslations: (translations: Translation[]) => void;
  updateSession: (updates: Partial<Workspace>) => void;
  
  setActiveTab: (tab: string) => void;
  
  setActiveSegmentId: (id: string | undefined) => void;
  updateActiveLayer: (updates: Partial<Workspace> | Partial<Translation>) => void;
}

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      session: null,
      draftText: "",
      
      activeTab: "original",
      translationViewMode: "document",      
      activeSegmentId: undefined,

      isTagPanelOpen: false,
      setTagPanelOpen: (isOpen) => set({ isTagPanelOpen: isOpen }),
      
      isDirty: false,
      lastChangedAt: 0,

      loadSession: (workspace) => {        
        const populatedSegments = workspace.segments 
          ? populateSegmentText(workspace.segments, workspace.text || "")
          : [];

        const normalized: Workspace = {
          ...workspace,
          userSpans: workspace.userSpans ?? [],
          apiSpans: workspace.apiSpans ?? [],
          deletedApiKeys: workspace.deletedApiKeys ?? [],
          tags: workspace.tags ?? [],
          translations: workspace.translations ?? [],
          segments: populatedSegments,
        };

        set({
          session: normalized,
          draftText: normalized.text || "", 
          isDirty: false,
          lastChangedAt: 0,
          activeTab: "original",
          activeSegmentId: undefined,
        });
      },

      resetSession: () => {
        set({
          session: null,
          draftText: "",
          isDirty: false,
          lastChangedAt: 0,
          activeTab: "original",
          activeSegmentId: undefined,
        });
      },

      setLoading: () => {
         set({
          session: {
            id: "",
            name: "",
            owner: "",
            updatedAt: 0,
            text: "",
            userSpans: [],
            apiSpans: [],
            deletedApiKeys: [],
            tags: [],
            translations: [],
            segments: [],
          },
          draftText: "",
          isDirty: false,
        });
      },

      setDraftText: (newText) => {
        const state = get();
        if (state.draftText === newText) return;

        const isNowDirty = newText !== state.session?.text;

        set({ 
          draftText: newText,
          isDirty: isNowDirty,
          lastChangedAt: Date.now(),
        });
      },

      updateUserSpans: (nextUserSpans) => {
        const state = get();
        if (!state.session) return;

        const currentUserSpans = state.session.userSpans ?? [];

        if (areSpansEqual(currentUserSpans, nextUserSpans)) return;

        set({
          session: { ...state.session, userSpans: nextUserSpans },
          isDirty: true,
          lastChangedAt: Date.now(),
        });
      },

      updateApiSpans: (nextApiSpans) => {
        const state = get();
        if (!state.session) return;

        const currentApiSpans = state.session.apiSpans ?? [];

        if (areSpansEqual(currentApiSpans, nextApiSpans)) return;

        set({
          session: { ...state.session, apiSpans: nextApiSpans },
          isDirty: true,
          lastChangedAt: Date.now(),
        });
      },

      updateDeletedApiKeys: (nextKeys) => {
        const state = get();
        if (!state.session) return;

        const currentKeys = state.session.deletedApiKeys ?? [];

        if (currentKeys.length === nextKeys.length && 
            currentKeys.every((k, i) => k === nextKeys[i])) return;

        set({
          session: { ...state.session, deletedApiKeys: nextKeys },
          isDirty: true,
          lastChangedAt: Date.now(),
        });
      },

      updateSegments: (nextSegments) => {
        const state = get();
        if (!state.session) return;
        
        const currentSegments = state.session.segments ?? [];
        
        if (areSegmentsEqual(currentSegments, nextSegments)) return;

        set({
          session: { ...state.session, segments: nextSegments },
          isDirty: true,
          lastChangedAt: Date.now(),
        });
      },

      updateTranslations: (nextTranslations) => {
        const state = get();
        if (!state.session) return;
        
        const currentTranslations = state.session.translations ?? [];
        
        if (areTranslationsEqual(currentTranslations, nextTranslations)) return;

        set({
          session: { ...state.session, translations: nextTranslations },
          isDirty: true,
          lastChangedAt: Date.now(),
        });
      },

      updateSession: (updates) => {
        const state = get();
        if (!state.session) return;

        set({
          session: { ...state.session, ...updates },
          isDirty: true,
          lastChangedAt: Date.now(),
        });
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      setActiveSegmentId: (id) => {
        set({ activeSegmentId: id });
      },

      updateActiveLayer: (updates: Partial<Workspace> | Partial<Translation>) => set((state) => {
        if (!state.session) return state; 
      
        if (state.activeTab === "original") {
          return { 
            session: { ...state.session, ...updates } 
          };
        } else {
          const updatedTranslations = (state.session.translations || []).map((t) =>
            t.language === state.activeTab ? { ...t, ...updates } : t
          );
          return { 
            session: { ...state.session, translations: updatedTranslations } 
          };
        }
      }),
    }),
    { name: 'session-store' }
  )
);