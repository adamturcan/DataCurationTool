import { useCallback } from "react";
import { useSessionStore } from "../stores";
import type { AnnotationResult } from "../../application/services/AnnotationWorkflowService";
import type { AnnotationLayer } from "../../types";

export function useLayerOperations() {
  const sessionStore = useSessionStore();
  const { session, draftText } = sessionStore;

  const resolveLayer = useCallback(
    (lang: string): AnnotationLayer | null => {
      if (!session) return null;
      if (lang === "original") {
        return {
          text: session.text || draftText || "",
          userSpans: session.userSpans ?? [],
          apiSpans: session.apiSpans ?? [],
        };
      }
      const t = session.translations?.find((tr) => tr.language === lang);
      if (!t) return null;
      return {
        text: t.text || "",
        userSpans: t.userSpans ?? [],
        apiSpans: t.apiSpans ?? [],
        segmentTranslations: t.segmentTranslations,
        editedSegmentTranslations: t.editedSegmentTranslations,
      };
    },
    [session, draftText]
  );

  const applyLayerPatch = useCallback(
    (lang: string, patch: AnnotationResult["layerPatch"]) => {
      if (!patch) return;
      if (lang === "original") {
        sessionStore.updateSession(patch);
      } else {
        const currentSession = useSessionStore.getState().session;
        const translations = (currentSession?.translations || []).map((t) =>
          t.language === lang ? { ...t, ...patch } : t
        );
        sessionStore.updateSession({ translations });
      }
    },
    [sessionStore]
  );

  const markSegmentEdited = useCallback(
    (segmentId: string | undefined, lang: string) => {
      const currentSession = useSessionStore.getState().session;
      if (!segmentId || !currentSession) return;
      if (lang === "original") {
        const updatedSegments = (currentSession.segments || []).map((s) =>
          s.id === segmentId ? { ...s, isEdited: true } : s
        );
        sessionStore.updateSession({ segments: updatedSegments });
      } else {
        const translations = (currentSession.translations || []).map((t) =>
          t.language === lang
            ? {
                ...t,
                editedSegmentTranslations: {
                  ...(t.editedSegmentTranslations || {}),
                  [segmentId]: true,
                },
              }
            : t
        );
        sessionStore.updateSession({ translations });
      }
    },
    [sessionStore]
  );

  return { resolveLayer, applyLayerPatch, markSegmentEdited };
}
