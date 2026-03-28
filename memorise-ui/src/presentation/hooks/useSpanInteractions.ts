import { useCallback, useState } from "react";
import { useSessionStore, useNotificationStore } from "../stores";
import { annotationWorkflowService } from "../../application/services/AnnotationWorkflowService";
import { getSpanId, safeSubstring, normalizeReplacement, SPLIT_DELIMITERS } from "../components/editor/utils/editorUtils";
import type { NerSpan, SelectionBox } from "../../types";
import type { useLayerOperations } from "./useLayerOperations";

type LayerOps = ReturnType<typeof useLayerOperations>;

export type SplitAnchor = { top: number; left: number; pos: number; segmentId: string };

export function useSpanInteractions(
  layers: LayerOps,
  onSplitDetected: (anchor: SplitAnchor) => void,
  onSplitCleared: () => void,
) {
  const { resolveLayer, applyLayerPatch, markSegmentEdited } = layers;

  const sessionStore = useSessionStore();
  const notify = useNotificationStore.getState().enqueue;
  const { session, draftText, activeSegmentId, setActiveSegmentId } = sessionStore;

  const [activeSpan, setActiveSpan] = useState<NerSpan | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [cmReplaceFn, setCmReplaceFn] = useState<((text: string) => void) | null>(null);
  const [newSelection, setNewSelection] = useState<{ start: number; end: number; top: number; left: number; segmentId?: string; localLang?: string; virtualStart?: number } | null>(null);
  const [actionLangContext, setActionLangContext] = useState("original");

  const closeEditMenu = useCallback(() => {
    setActiveSpan(null);
    setMenuAnchor(null);
    setCmReplaceFn(null);
  }, []);

  const handleSpanClick = useCallback((span: NerSpan, element: HTMLElement, replaceFn: (newText: string) => void, localLang: string, vStart: number) => {
    setNewSelection(null);
    const globalizedSpan = { ...span, start: span.start + vStart, end: span.end + vStart };
    const id = getSpanId(globalizedSpan);
    setActiveSpan({ ...globalizedSpan, id });
    setActionLangContext(localLang);
    setMenuAnchor(element);
    setCmReplaceFn(() => replaceFn);
  }, []);

  const handleCreateSpan = useCallback((category: string) => {
    if (!newSelection || !newSelection.localLang) return;
    setActiveSegmentId(newSelection.segmentId);

    const layer = resolveLayer(newSelection.localLang);
    if (layer && newSelection.segmentId) {
      const result = annotationWorkflowService.createSpan(category, newSelection.start, newSelection.end, { layer, activeSegmentId: newSelection.segmentId, segments: session?.segments ?? [] });
      if (result.ok) {
        applyLayerPatch(newSelection.localLang, result.layerPatch);
        markSegmentEdited(newSelection.segmentId, newSelection.localLang);
      }
    }

    setNewSelection(null);
  }, [newSelection, setActiveSegmentId, session, resolveLayer, applyLayerPatch, markSegmentEdited]);

  const handleSelectionChange = useCallback((sel: SelectionBox | null, segmentId: string, localLang: string, virtualStart: number) => {
    if (!sel) {
      setNewSelection(null);
      onSplitCleared();
      return;
    }

    const segmentText = segmentId === "root" ? draftText : (session?.segments?.find(s => s.id === segmentId)?.text || "");
    const selectedText = segmentText.substring(sel.start, sel.end).trim();
    const isDelimiter = selectedText.length === 1 && SPLIT_DELIMITERS.includes(selectedText);

    if (isDelimiter && localLang === "original") {
      setActiveSegmentId(segmentId);
      closeEditMenu();
      setNewSelection(null);
      onSplitDetected({ top: sel.top, left: sel.left, pos: virtualStart + sel.end, segmentId });
    } else {
      onSplitCleared();
      closeEditMenu();
      setNewSelection({ ...sel, segmentId, localLang, virtualStart });
    }
  }, [session?.segments, draftText, closeEditMenu, setActiveSegmentId, onSplitDetected, onSplitCleared]);

  const handleUpdateSpanText = useCallback((newText: string) => {
    if (!activeSpan) return;
    const normalized = normalizeReplacement(newText);
    if (normalized.trim().length === 0) {
      const layer = resolveLayer(actionLangContext);
      if (layer && activeSpan.id) {
        const result = annotationWorkflowService.deleteSpan(activeSpan.id, { layer, deletedApiKeys: session?.deletedApiKeys ?? [] });
        if (result.ok) {
          applyLayerPatch(actionLangContext, result.layerPatch);
          if (result.deletedApiKeys) sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
          markSegmentEdited(activeSegmentId, actionLangContext);
        }
        notify(result.notice);
      }
      closeEditMenu();
      return;
    }
    cmReplaceFn?.(normalized);
    markSegmentEdited(activeSegmentId, actionLangContext);
    closeEditMenu();
  }, [activeSpan, cmReplaceFn, closeEditMenu, actionLangContext, session, draftText, activeSegmentId, resolveLayer, applyLayerPatch, markSegmentEdited, sessionStore, notify]);

  const handleCategorySelect = useCallback((category: string) => {
    if (activeSpan?.id) {
      const layer = resolveLayer(actionLangContext);
      if (layer) {
        const result = annotationWorkflowService.updateSpanCategory(activeSpan.id, category, { layer });
        if (result.ok) {
          applyLayerPatch(actionLangContext, result.layerPatch);
          markSegmentEdited(activeSegmentId, actionLangContext);
        }
        notify(result.notice);
      }
    }
    closeEditMenu();
  }, [activeSpan, actionLangContext, activeSegmentId, resolveLayer, applyLayerPatch, markSegmentEdited, notify, closeEditMenu]);

  const handleDeleteSpan = useCallback(() => {
    if (activeSpan?.id) {
      const layer = resolveLayer(actionLangContext);
      if (layer) {
        const result = annotationWorkflowService.deleteSpan(activeSpan.id, { layer, deletedApiKeys: session?.deletedApiKeys ?? [] });
        if (result.ok) {
          applyLayerPatch(actionLangContext, result.layerPatch);
          if (result.deletedApiKeys) sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
          markSegmentEdited(activeSegmentId, actionLangContext);
        }
        notify(result.notice);
      }
      closeEditMenu();
    }
  }, [activeSpan, actionLangContext, activeSegmentId, session, resolveLayer, applyLayerPatch, markSegmentEdited, sessionStore, notify, closeEditMenu]);

  const virtualElement = newSelection ? ({ getBoundingClientRect: () => ({ top: newSelection.top, left: newSelection.left, bottom: newSelection.top, right: newSelection.left, width: 0, height: 0 }), nodeType: 1 } as unknown as HTMLElement) : null;

  const layerText = activeSpan ? (resolveLayer(actionLangContext)?.text || draftText) : "";
  const spanText = activeSpan ? safeSubstring(layerText, activeSpan.start, activeSpan.end) : "";

  return {
    activeSpan,
    menuAnchor,
    newSelection,
    virtualElement,
    spanText,
    closeEditMenu,
    handleSpanClick,
    handleCreateSpan,
    handleSelectionChange,
    handleUpdateSpanText,
    handleCategorySelect,
    handleDeleteSpan,
    setNewSelection,
  };
}
