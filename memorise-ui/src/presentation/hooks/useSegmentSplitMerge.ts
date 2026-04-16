import { useCallback, useMemo, useState } from "react";
import { useSessionStore, useNotificationStore } from "../stores";
import { useActionGuard } from "./useActionGuard";
import type { ActionGuardActions } from "./useActionGuard";
import { segmentWorkflowService } from "../../application/workflows/SegmentWorkflowService";
import { translationWorkflowService } from "../../application/workflows/TranslationWorkflowService";
import { SegmentLogic } from "../../core/entities/SegmentLogic";
import { SpanLogic } from "../../core/entities/SpanLogic";
import type { SplitAnchor } from "./useSpanInteractions";

/** Manages segment split, join, and boundary-shift operations with translation guards */
export function useSegmentSplitMerge() {
  const sessionStore = useSessionStore();
  const notify = useNotificationStore.getState().enqueue;
  const { session } = sessionStore;

  const [splitAnchor, setSplitAnchor] = useState<SplitAnchor | null>(null);
  const [draggingFromIndex, setDraggingFromIndex] = useState<number | null>(null);

  const guardActions: ActionGuardActions = useMemo(() => ({
    translateSegment: async (segmentId: string, lang: string) => {
      const fresh = useSessionStore.getState().session;
      const result = await translationWorkflowService.addSegmentTranslation(lang, segmentId, {
        segments: fresh?.segments || [],
        translations: fresh?.translations || [],
      });
      if (result.ok && result.translationsPatch) {
        useSessionStore.getState().updateTranslations(result.translationsPatch);
      }
      if (!result.ok) throw new Error(result.notice.message);
    },
    deleteSegmentTranslation: (lang: string, segmentId: string) => {
      const fresh = useSessionStore.getState().session;
      const currentLayer = fresh?.translations?.find(t => t.language === lang);
      if (currentLayer) {
        const oldSegTrans = currentLayer.segmentTranslations || {};
        const deletedText = oldSegTrans[segmentId] || "";
        const segments = fresh?.segments || [];
        const deletedStart = SegmentLogic.calculateGlobalOffset(segmentId, segments, oldSegTrans);
        const deletedEnd = deletedStart + deletedText.length;

        const newSegs = { ...oldSegTrans };
        delete newSegs[segmentId];
        const newFullText = segments.map(s => newSegs[s.id] || "").join("");

        const { nextUserSpans, nextApiSpans } = SpanLogic.removeAndShiftBoth(
          currentLayer.userSpans || [], currentLayer.apiSpans || [], deletedStart, deletedEnd, -deletedText.length
        );

        const translations = (fresh?.translations || []).map(t =>
          t.language === lang ? { ...t, segmentTranslations: newSegs, text: newFullText, userSpans: nextUserSpans, apiSpans: nextApiSpans } : t
        );
        useSessionStore.getState().updateSession({ translations });
      }
    },
  }), []);

  const { guardJoin, guardSplit, guardShift, dialogProps: guardDialogProps, closeDialog: closeGuardDialog } = useActionGuard(guardActions);

  const handleJoinUp = useCallback((segmentId: string) => {
    const idx = session?.segments?.findIndex(s => s.id === segmentId) ?? -1;
    if (idx <= 0 || !session?.segments) return;

    const seg1Id = session.segments[idx - 1].id;
    const segments = session.segments;
    const translations = session.translations || [];

    guardJoin(seg1Id, segmentId, segments, translations, () => {
      const fresh = useSessionStore.getState().session;
      const result = segmentWorkflowService.joinSegments(seg1Id, segmentId, {
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      });
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
      }
      notify(result.notice);
    });
  }, [session?.segments, session?.translations, notify, guardJoin]);

  const handleConfirmSplit = useCallback(() => {
    if (!splitAnchor) return;
    const { pos, segmentId } = splitAnchor;
    const segments = session?.segments || [];
    const translations = session?.translations || [];

    setSplitAnchor(null);

    guardSplit(segmentId, segments, translations, () => {
      const fresh = useSessionStore.getState().session;
      const freshDraft = useSessionStore.getState().draftText;
      const result = segmentWorkflowService.splitSegment(pos, {
        text: freshDraft,
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      }, segmentId);
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
      }
      notify(result.notice);
    });
  }, [splitAnchor, session?.translations, session?.segments, notify, guardSplit]);

  const handleShiftBoundary = useCallback((sourceSegmentId: string, globalTargetPos: number) => {
    const segments = session?.segments || [];
    const translations = session?.translations || [];

    setDraggingFromIndex(null);

    guardShift(sourceSegmentId, globalTargetPos, segments, translations, async () => {
      const fresh = useSessionStore.getState().session;
      const freshDraft = useSessionStore.getState().draftText;
      const result = await segmentWorkflowService.shiftSegmentBoundary(sourceSegmentId, globalTargetPos, {
        text: freshDraft,
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      });
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
        if (result.patch.text) {
          useSessionStore.getState().setDraftText(result.patch.text);
        }
      }
      notify(result.notice);
    });
  }, [session?.segments, session?.translations, notify, guardShift]);

  return {
    splitAnchor,
    setSplitAnchor,
    draggingFromIndex,
    setDraggingFromIndex,
    handleJoinUp,
    handleConfirmSplit,
    handleShiftBoundary,
    guardDialogProps,
    closeGuardDialog,
  };
}
