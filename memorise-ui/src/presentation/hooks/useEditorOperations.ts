import { useCallback, useState } from "react";
import { useSessionStore, useNotificationStore, useWorkspaceStore } from "../stores";
import { isAppError, toAppError } from "../../shared/errors";
import { presentAppError } from "../../application/errors";
import { useConflictResolution } from "./useConflictResolution";

import { annotationWorkflowService } from "../../application/workflows/AnnotationWorkflowService";
import { segmentWorkflowService } from "../../application/workflows/SegmentWorkflowService";
import { editorWorkflowService } from "../../application/workflows/EditorWorkflowService";
import { taggingWorkflowService } from "../../application/workflows/TaggingWorkflowService";
import { translationWorkflowService } from "../../application/workflows/TranslationWorkflowService";

import type { AnnotationLayer, SpanCoordMap } from "../../types";
import type { useLayerOperations } from "./useLayerOperations";

type LayerOps = ReturnType<typeof useLayerOperations>;

/** Coordinates API calls for NER, segmentation, translation, tagging, and save */
export function useEditorOperations(layers: LayerOps) {
  const { resolveLayer, applyLayerPatch } = layers;

  const sessionStore = useSessionStore();
  const notify = useNotificationStore.getState().enqueue;
  const { session, draftText, setDraftText, setActiveSegmentId, activeTab } = sessionStore;
  const setActiveTab = useSessionStore((state) => state.setActiveTab);
  const updateTranslations = useSessionStore((state) => state.updateTranslations);

  const [isProcessing, setIsProcessing] = useState(false);

  const { conflictPrompt, requestConflictResolution, resolveConflictPrompt } = useConflictResolution();

  const handleError = useCallback((err: unknown) => {
    const appError = isAppError(err) ? err : toAppError(err);
    const notice = presentAppError(appError);
    notify(notice);
  }, [notify]);

  // --- Translation operations ---

  const handleRunGlobalTranslate = useCallback(async (targetLang: string) => {
    if (!session) return;
    setIsProcessing(true);
    try {
      const result = await translationWorkflowService.addTranslation(targetLang, {
        segments: session.segments || [],
        translations: session.translations || [],
        text: draftText,
      });

      if (result.ok) {
        if (result.translationsPatch) updateTranslations(result.translationsPatch);
        if (result.newActiveTab) setActiveTab(result.newActiveTab);
        if (result.newActiveTab && result.translationsPatch) {
          const newText = result.translationsPatch.find(t => t.language === result.newActiveTab)?.text || "";
          setDraftText(newText);
        }
      }
      notify(result.notice);
    } catch (err) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  }, [session, updateTranslations, setActiveTab, setDraftText, notify, handleError]);

  const handleTranslateSegment = useCallback(async (segmentId: string, lang: string) => {
    if (!session) return;
    setIsProcessing(true);
    notify({ message: `Translating segment to ${lang}...`, tone: "info" });
    try {
      const result = await translationWorkflowService.addSegmentTranslation(lang, segmentId, {
        segments: session.segments || [],
        translations: session.translations || [],
        text: draftText,
      });

      if (result.ok) {
        if (result.translationsPatch) updateTranslations(result.translationsPatch);
        if (result.newActiveTab) setActiveTab(result.newActiveTab);
        if (segmentId === "root" && result.newActiveTab && result.translationsPatch) {
          const newText = result.translationsPatch.find(t => t.language === result.newActiveTab)?.text || "";
          if (newText) setDraftText(newText);
        }
      }
      notify(result.notice);
    } catch (err) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  }, [session, draftText, setDraftText, updateTranslations, setActiveTab, notify, handleError]);

  const handleDeleteSegmentTranslation = useCallback((lang: string, segmentId: string) => {
    if (!session) return;
    const result = translationWorkflowService.deleteSegmentTranslation(lang, segmentId, {
      segments: session.segments || [],
      translations: session.translations || [],
    });
    if (result.ok && result.translationsPatch) {
      updateTranslations(result.translationsPatch);
    }
    notify(result.notice);
  }, [session, updateTranslations, notify]);

  const handleUpdateSegmentTranslation = useCallback(async (segmentId: string, lang: string) => {
    if (!session) return;
    setIsProcessing(true);
    notify({ message: `Updating translation (${lang})...`, tone: "info" });
    try {
      const result = await translationWorkflowService.updateSegmentTranslation(lang, segmentId, {
        segments: session.segments || [],
        translations: session.translations || [],
      });
      if (result.ok && result.translationsPatch) {
        updateTranslations(result.translationsPatch);
      }
      notify(result.notice);
    } catch (err) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  }, [session, updateTranslations, notify, handleError]);

  // --- Per-segment NER / SemTag ---

  const handleRunSegmentNer = useCallback(async (segmentId: string, lang: string) => {
    notify({ message: `Running NER on segment (${lang})...`, tone: "info" });
    setActiveSegmentId(segmentId);
    const layer = resolveLayer(lang);
    if (layer && segmentId) {
      const result = await annotationWorkflowService.runNer({ layer, activeSegmentId: segmentId, segments: session?.segments || [], deletedApiKeys: session?.deletedApiKeys ?? [] }, requestConflictResolution);
      if (result.ok) {
        applyLayerPatch(lang, result.layerPatch);
        sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
      }
      notify(result.notice);
    }
  }, [notify, setActiveSegmentId, session, draftText, requestConflictResolution, resolveLayer, applyLayerPatch, sessionStore]);

  const handleRunSegmentSemTag = useCallback(async (segmentId: string, lang: string) => {
    notify({ message: `Running Sem-Tag on segment (${lang})...`, tone: "info" });
    setActiveSegmentId(segmentId);
    const result = await taggingWorkflowService.runClassify(false, { activeSegmentId: segmentId, segments: session?.segments || [], draftText, translations: session?.translations || [], text: session?.text || "", activeTab: lang, tags: session?.tags || [] });
    if (result.ok && result.tags) {
      sessionStore.updateSession({ tags: result.tags });
    }
    notify(result.notice);
  }, [notify, setActiveSegmentId, session, draftText, sessionStore]);

  // --- Text change ---

  const handleTextChange = useCallback((segmentId: string, text: string, liveCoords: SpanCoordMap | undefined, deadIds?: string[], localLang?: string) => {
    const lang = localLang || "original";
    const layer = resolveLayer(lang);
    if (!layer) return;
    const targetSegmentId = segmentId === "root" ? "" : segmentId;
    const result = editorWorkflowService.handleTextChange(
      text, targetSegmentId, lang,
      { fullText: draftText, segments: session?.segments || [] },
      layer, liveCoords, deadIds
    );
    if (!result) return;
    setDraftText(result.draftText);
    applyLayerPatch(result.lang, result.layerPatch);
  }, [session, draftText, setDraftText, resolveLayer, applyLayerPatch]);

  // --- Global operations ---

  const handleRunGlobalNer = useCallback(async () => {
    setIsProcessing(true); setActiveSegmentId(undefined);
    try {
      const originalLayer = resolveLayer("original");
      if (originalLayer) {
        const result = await annotationWorkflowService.runNer({ layer: originalLayer, segments: session?.segments || [], deletedApiKeys: session?.deletedApiKeys ?? [] }, requestConflictResolution);
        if (result.ok) {
          applyLayerPatch("original", result.layerPatch);
          sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
        }
        notify(result.notice);
      }

      const translations = useSessionStore.getState().session?.translations || [];
      for (const t of translations) {
        const freshSession = useSessionStore.getState().session;
        const tLayer = freshSession?.translations?.find(tr => tr.language === t.language);
        if (!tLayer?.text?.trim()) continue;

        const layer: AnnotationLayer = {
          text: tLayer.text || "",
          userSpans: tLayer.userSpans ?? [],
          apiSpans: tLayer.apiSpans ?? [],
          segmentTranslations: tLayer.segmentTranslations,
          editedSegmentTranslations: tLayer.editedSegmentTranslations,
        };

        const result = await annotationWorkflowService.runNer({ layer, segments: freshSession?.segments || [], deletedApiKeys: freshSession?.deletedApiKeys ?? [] }, requestConflictResolution);
        if (result.ok) {
          applyLayerPatch(t.language, result.layerPatch);
          if (result.deletedApiKeys) sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
        }
      }

      if (translations.length > 0) {
        notify({ message: `NER completed for original + ${translations.length} translation(s).`, tone: "success" });
      }
    } finally { setIsProcessing(false); }
  }, [session, draftText, notify, requestConflictResolution, resolveLayer, applyLayerPatch, sessionStore]);

  const handleRunGlobalSemTag = useCallback(async () => {
    setIsProcessing(true);
    setActiveSegmentId(undefined);
    try {
      const segments = session?.segments || [];

      if (segments.length === 0) {
        // No segments — classify the whole document as original text
        const result = await taggingWorkflowService.runClassify(true, { activeSegmentId: undefined, segments: [], draftText, translations: session?.translations || [], text: session?.text || "", activeTab: "original", tags: session?.tags || [] });
        if (result.ok && result.tags) {
          sessionStore.updateSession({ tags: result.tags });
        }
        notify(result.notice);
      } else {
        // Classify each segment using its original text
        let currentTags = session?.tags || [];
        let successCount = 0;

        for (const seg of segments) {
          const result = await taggingWorkflowService.runClassify(false, {
            activeSegmentId: seg.id,
            segments,
            draftText,
            translations: session?.translations || [],
            text: session?.text || "",
            activeTab: "original",
            tags: currentTags,
          });
          if (result.ok && result.tags) {
            currentTags = result.tags;
            successCount++;
          }
        }

        sessionStore.updateSession({ tags: currentTags });
        notify({
          message: successCount > 0
            ? `Tagged ${successCount} of ${segments.length} segment(s).`
            : "No segments could be classified.",
          tone: successCount > 0 ? "success" : "error",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [session, draftText, notify, sessionStore]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    setIsProcessing(true);
    try {
      const result = await editorWorkflowService.saveWorkspace(session, draftText);
      if (result.ok) {
        if (result.sessionPatch) sessionStore.updateSession(result.sessionPatch);
        if (result.workspaceMetadataPatch) useWorkspaceStore.getState().updateWorkspaceMetadata(session.id, result.workspaceMetadataPatch);
      }
      notify(result.notice);
    } finally { setIsProcessing(false); }
  }, [session, draftText, notify, sessionStore]);

  const handleRunGlobalSegment = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await segmentWorkflowService.runAutoSegmentation({ text: draftText, translations: session?.translations, segments: session?.segments }, activeTab);
      if (result.ok && result.patch) {
        sessionStore.updateSession(result.patch);
      }
      if (result.notice) {
        notify(result.notice);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [session?.segments, session?.translations, activeTab, notify, sessionStore, draftText]);

  return {
    isProcessing,
    conflictPrompt,
    resolveConflictPrompt,
    handleRunGlobalNer,
    handleRunGlobalSemTag,
    handleRunGlobalSegment,
    handleRunGlobalTranslate,
    handleSave,
    handleTranslateSegment,
    handleDeleteSegmentTranslation,
    handleUpdateSegmentTranslation,
    handleRunSegmentNer,
    handleRunSegmentSemTag,
    handleTextChange,
  };
}
