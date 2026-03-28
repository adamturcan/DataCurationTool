import { SpanLogic } from "../../core/domain/entities/SpanLogic";
import { SegmentLogic } from "../../core/domain/entities/SegmentLogic";
import type { NerSpan, AnnotationLayer, Segment, Workspace, SpanCoordMap, WorkflowResult } from "../../types";
import { getWorkspaceApplicationService } from "../../infrastructure/providers/workspaceProvider";

export type TextChangeResult = {
  draftText: string;
  layerPatch: Partial<AnnotationLayer> & { segments?: Segment[]; segmentTranslations?: Record<string, string>; editedSegmentTranslations?: Record<string, boolean> };
  lang: string;
}

export type SaveResult = WorkflowResult & {
  sessionPatch?: { text: string; isDirty: false };
  workspaceMetadataPatch?: { updatedAt: number };
}

export class EditorWorkflowService {

  handleTextChange(
    text: string,
    activeSegId: string,
    lang: string,
    session: { fullText: string; segments: Segment[] },
    layer: AnnotationLayer,
    liveCoords?: SpanCoordMap,
    deadSpanIds?: string[]
  ): TextChangeResult | undefined {

    if (!session || !layer) return undefined;

    const { nextUserSpans, nextApiSpans, shiftedInStepA } = this.syncLiveSpans(
      layer, lang, activeSegId, session.segments, liveCoords, deadSpanIds
    );

    if (!activeSegId) {
      return {
        draftText: text,
        layerPatch: { text, userSpans: nextUserSpans, apiSpans: nextApiSpans },
        lang
      };
    }

    if (lang === "original") {
      return this.processMasterSegmentEdit(text, activeSegId, session.fullText, session.segments, nextUserSpans, nextApiSpans, shiftedInStepA);
    } else {
      return this.processTranslationSegmentEdit(text, activeSegId, layer, lang, session.segments, nextUserSpans, nextApiSpans, shiftedInStepA);
    }
  }

  private syncLiveSpans(
    layer: AnnotationLayer,
    lang: string,
    activeSegId: string,
    segments: Segment[],
    liveCoords?: SpanCoordMap,
    deadSpanIds?: string[]
  ) {
    const deadSet = new Set(deadSpanIds || []);
    const getId = (s: NerSpan) => s.id ?? `span-${s.start}-${s.end}-${s.entity}`;

    let nextUserSpans = (layer.userSpans ?? []).filter((s: NerSpan) => !deadSet.has(getId(s)));
    let nextApiSpans = (layer.apiSpans ?? []).filter((s: NerSpan) => !deadSet.has(getId(s)));
    const shiftedInStepA = new Set<string>();

    if (!liveCoords) return { nextUserSpans, nextApiSpans, shiftedInStepA };

    let shiftOffset = 0;
    if (activeSegId && segments) {
      const translations = lang === "original" ? undefined : layer.segmentTranslations;
      shiftOffset = SegmentLogic.calculateGlobalOffset(activeSegId, segments, translations);
    }

    nextUserSpans = SpanLogic.syncLiveCoords(nextUserSpans, liveCoords, shiftOffset, shiftedInStepA);
    nextApiSpans = SpanLogic.syncLiveCoords(nextApiSpans, liveCoords, shiftOffset, shiftedInStepA);

    return { nextUserSpans, nextApiSpans, shiftedInStepA };
  }

  private processMasterSegmentEdit(
    text: string, activeSegId: string, fullText: string, segments: Segment[],
    userSpans: NerSpan[], apiSpans: NerSpan[], shiftedSet: Set<string>
  ): TextChangeResult | undefined {
    const masterActiveSegment = segments.find(s => s.id === activeSegId);
    if (!masterActiveSegment) return undefined;

    const lengthDiff = text.length - (masterActiveSegment.end - masterActiveSegment.start);
    const updatedFull = fullText.substring(0, masterActiveSegment.start) + text + fullText.substring(masterActiveSegment.end);

    let updatedSegments = SegmentLogic.updateSegmentAndShift(
      segments, masterActiveSegment.id, masterActiveSegment.start + text.length, lengthDiff, masterActiveSegment.end
    );
    updatedSegments = updatedSegments.map(seg =>
      seg.id === masterActiveSegment.id
        ? { ...seg, text, isEdited: true }
        : { ...seg, text: updatedFull.substring(seg.start, seg.end) }
    );

    const nextUserSpans = SpanLogic.shiftSpansAfterEdit(userSpans, masterActiveSegment.end, lengthDiff, shiftedSet);
    const nextApiSpans = SpanLogic.shiftSpansAfterEdit(apiSpans, masterActiveSegment.end, lengthDiff, shiftedSet);

    return {
      draftText: updatedFull,
      layerPatch: { text: updatedFull, segments: updatedSegments, userSpans: nextUserSpans, apiSpans: nextApiSpans },
      lang: "original"
    };
  }

  private processTranslationSegmentEdit(
    text: string, activeSegId: string, layer: AnnotationLayer, lang: string, segments: Segment[],
    userSpans: NerSpan[], apiSpans: NerSpan[], shiftedSet: Set<string>
  ): TextChangeResult | undefined {
    const oldSegText = layer.segmentTranslations?.[activeSegId] || "";
    const lengthDiff = text.length - oldSegText.length;

    const updatedSegmentTranslations = {
      ...(layer.segmentTranslations || {}),
      [activeSegId]: text
    };

    const updatedEditedSegmentTranslations = {
      ...(layer.editedSegmentTranslations || {}),
      [activeSegId]: true
    };

    const updatedFull = segments.map(s => updatedSegmentTranslations[s.id] || "").join("");
    const virtualStart = SegmentLogic.calculateGlobalOffset(activeSegId, segments, layer.segmentTranslations);
    const virtualEnd = virtualStart + oldSegText.length;

    const nextUserSpans = SpanLogic.shiftSpansAfterEdit(userSpans, virtualEnd, lengthDiff, shiftedSet);
    const nextApiSpans = SpanLogic.shiftSpansAfterEdit(apiSpans, virtualEnd, lengthDiff, shiftedSet);

    return {
      draftText: updatedFull,
      layerPatch: { text: updatedFull, segmentTranslations: updatedSegmentTranslations, editedSegmentTranslations: updatedEditedSegmentTranslations, userSpans: nextUserSpans, apiSpans: nextApiSpans },
      lang
    };
  }

  async saveWorkspace(session: Workspace, draftText: string): Promise<SaveResult> {
    if (!session || !session.id) {
      return { ok: false, notice: { message: "No active workspace to save.", tone: "error" } };
    }

    try {
      const appService = getWorkspaceApplicationService();

      const patch = {
        text: draftText,
        userSpans: session.userSpans,
        apiSpans: session.apiSpans,
        deletedApiKeys: session.deletedApiKeys,
        tags: session.tags,
        translations: session.translations,
        segments: session.segments,
      };

      await appService.updateWorkspace({
        workspaceId: session.id,
        patch
      });

      const now = Date.now();

      return {
        ok: true,
        notice: { message: "Workspace saved successfully.", tone: "success" },
        sessionPatch: { text: draftText, isDirty: false as const },
        workspaceMetadataPatch: { updatedAt: now },
      };

    } catch (error) {
      console.error("Failed to save workspace:", error);
      return { ok: false, notice: { message: "Failed to save workspace.", tone: "error" } };
    }
  }
}

export const editorWorkflowService = new EditorWorkflowService();
