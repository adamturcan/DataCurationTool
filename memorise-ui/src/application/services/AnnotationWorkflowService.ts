import { getApiService } from "../../infrastructure/providers/apiProvider";
import { resolveApiSpanConflicts, type ConflictPrompt } from "../../core/services/annotation/resolveApiSpanConflicts";
import type { NerSpan, AnnotationLayer, Segment, WorkflowResult } from "../../types";
import { SegmentLogic } from "../../core/domain/entities/SegmentLogic";
import { v4 as uuidv4 } from "uuid";

export type AnnotationResult = WorkflowResult & {
  layerPatch?: { userSpans?: NerSpan[]; apiSpans?: NerSpan[] };
  deletedApiKeys?: string[];
};



export class AnnotationWorkflowService {
  private apiService = getApiService();

  private getSpanId(s: NerSpan): string {
    return s.id ?? `span-${s.start}-${s.end}-${s.entity}`;
  }



  async runNer(session: { layer: AnnotationLayer, activeSegmentId?: string, segments: Segment[], deletedApiKeys: string[] }, onConflict: (prompt: ConflictPrompt) => Promise<"api" | "existing">): Promise<AnnotationResult> {

    const { layer, activeSegmentId, segments, deletedApiKeys } = session;

    let textToProcess = "";
    let globalOffset = 0;

    if (activeSegmentId && segments) {
      const translations = layer?.segmentTranslations;
      globalOffset = SegmentLogic.calculateGlobalOffset(activeSegmentId, segments, translations);

      const targetSeg = segments.find(s => s.id === activeSegmentId);
      if (!targetSeg) return { ok: false, notice: { message: "Segment not found.", tone: "error" } };

      textToProcess = translations
        ? (translations[activeSegmentId] || "")
        : targetSeg.text;
    } else {
      textToProcess = layer.text || "";
    }

    if (!textToProcess.trim()) {
      return { ok: false, notice: { message: "No text to process.", tone: "error" } };
    }

    try {
      let incomingSpans = await this.apiService.ner(textToProcess);

      if (globalOffset > 0) {
        incomingSpans = incomingSpans.map((span) => ({
          ...span, start: span.start + globalOffset, end: span.end + globalOffset
        }));
      }

      const isValid = (s: NerSpan) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && !!s.entity?.trim();

      const userSpans = (layer.userSpans || []).filter(isValid);
      const apiSpans = (layer.apiSpans || []).filter(isValid);

      const filteredApiSpans = apiSpans.filter((s) => !deletedApiKeys.includes(`${s.start}:${s.end}:${s.entity}`));

      const { nextUserSpans, nextApiSpans, conflictsHandled } = await resolveApiSpanConflicts({
        text: layer.text || "", incomingSpans, userSpans, existingApiSpans: filteredApiSpans, onConflict,
      });

      return { ok: true, notice: { message: conflictsHandled > 0 ? "NER completed with conflicts." : "NER completed.", tone: "success" }, layerPatch: { userSpans: nextUserSpans, apiSpans: nextApiSpans }, deletedApiKeys: [] };

    } catch (error) {
      console.error("[AnnotationWorkflow] runNer failed:", error);
      return { ok: false, notice: { message: "Failed to run NER analysis.", tone: "error" } };
    }
  }

  deleteSpan(spanId: string, session: { layer: AnnotationLayer, deletedApiKeys: string[] }): AnnotationResult {

    const { layer, deletedApiKeys } = session;

    if (!layer) return { ok: false, notice: { message: "Layer not found.", tone: "error" } };

    const userSpans = layer.userSpans ?? [];
    const apiSpans = layer.apiSpans ?? [];


    const userSpanIndex = userSpans.findIndex(s => this.getSpanId(s) === spanId);

    if (userSpanIndex !== -1) {
      const nextUserSpans = [...userSpans];
      nextUserSpans.splice(userSpanIndex, 1);
      return { ok: true, notice: { message: "Span deleted.", tone: "success" }, layerPatch: { userSpans: nextUserSpans }, deletedApiKeys: [] };
    }

    const apiSpan = apiSpans.find(s => this.getSpanId(s) === spanId);
    if (apiSpan) {
      const keyToBan = `${apiSpan.start}:${apiSpan.end}:${apiSpan.entity}`;
      if (!deletedApiKeys.includes(keyToBan)) {
        return { ok: true, notice: { message: "Span deleted.", tone: "success" }, layerPatch: { apiSpans: apiSpans.filter((s) => this.getSpanId(s) !== spanId) }, deletedApiKeys: [...deletedApiKeys, keyToBan] };
      }
    }
    return { ok: false, notice: { message: "Span not found.", tone: "error" } };
  }

  createSpan(category: string, localStart: number, localEnd: number, session: { layer: AnnotationLayer, activeSegmentId: string, segments: Segment[] }): AnnotationResult {

    const { layer, activeSegmentId, segments } = session;

    let shiftOffset = 0;
    if (activeSegmentId && segments) {
      const translations = layer.segmentTranslations;
      shiftOffset = SegmentLogic.calculateGlobalOffset(activeSegmentId, segments, translations);
    }

    const newSpan: NerSpan = {
      id: uuidv4(),
      start: localStart + shiftOffset,
      end: localEnd + shiftOffset,
      entity: category,
      origin: "user"
    };

    return { ok: true, notice: { message: "Span created.", tone: "success" }, layerPatch: { userSpans: [...(layer.userSpans ?? []), newSpan] }, deletedApiKeys: [] };
  }

  updateSpanCategory(spanId: string, newCategory: string, session: { layer: AnnotationLayer }): AnnotationResult {

    const { layer } = session;
    if (!layer) return { ok: false, notice: { message: "Layer not found.", tone: "error" } };

    const updateSpans = (spans: NerSpan[]) =>
      spans.map((s) => (this.getSpanId(s) === spanId ? { ...s, entity: newCategory, id: spanId } : s));

    return {
      ok: true, notice: { message: "Span category updated.", tone: "success" }, layerPatch: {
        userSpans: updateSpans(layer.userSpans ?? []),
        apiSpans: updateSpans(layer.apiSpans ?? [])
      }
    };
  }

  deleteMultipleSpans(spanIds: string[], session: { layer: AnnotationLayer, deletedApiKeys: string[] }): AnnotationResult {

    const { layer, deletedApiKeys } = session;
    if (!layer) return { ok: false, notice: { message: "Layer not found.", tone: "error" } };

    const idsToRemove = new Set(spanIds);
    const nextUserSpans = (layer.userSpans ?? []).filter(s => !idsToRemove.has(this.getSpanId(s)));
    const newBannedKeys = (layer.apiSpans ?? [])
      .filter(s => idsToRemove.has(this.getSpanId(s)))
      .map(s => `${s.start}:${s.end}:${s.entity}`);

    return {
      ok: true, notice: { message: "Spans deleted.", tone: "success" }, layerPatch: {
        userSpans: nextUserSpans,
        apiSpans: layer.apiSpans?.filter(s => !idsToRemove.has(this.getSpanId(s)))
      }, deletedApiKeys: [...new Set([...deletedApiKeys, ...newBannedKeys])]
    };
  }
}

export const annotationWorkflowService = new AnnotationWorkflowService();