import { useCallback } from "react";
import { useSessionStore } from "../stores";
import type { AnnotationResult } from "../../application/workflows/AnnotationWorkflowService";
import type { AnnotationLayer } from "../../types";

/** Resolves, patches, and tracks edit state for original and translation annotation layers */
export function useLayerOperations() {
  const sessionStore = useSessionStore();
  const { session, draftText } = sessionStore;

  // Builds an AnnotationLayer snapshot for the given language tab —
  // either from the workspace root (original) or from a translation entry.
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

  // Writes span/text patches back to the correct layer in the session store.
  // For "original" patches go directly; for translations, the matching entry is updated.
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
