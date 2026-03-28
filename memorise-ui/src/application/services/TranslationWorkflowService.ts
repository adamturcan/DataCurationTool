import { getApiService } from "../../infrastructure/providers/apiProvider";
import { errorHandlingService } from "../../infrastructure/services/ErrorHandlingService";
import { SegmentLogic } from "../../core/domain/entities/SegmentLogic";
import { SpanLogic } from "../../core/domain/entities/SpanLogic";
import type { Translation, Segment, WorkflowResult } from "../../types";

export type TranslationResult = WorkflowResult & {
  translationsPatch?: Translation[];
  newActiveTab?: string;
  editorKey?: string;
};

export class TranslationWorkflowService {
  private apiService = getApiService();
  private errorService = errorHandlingService;

  async addTranslation(
    targetLang: string,
    session: { segments: Segment[]; translations: Translation[] }
  ): Promise<TranslationResult> {
    if (!session.segments || session.segments.length === 0) {
      return { ok: false, notice: { message: "Document must be segmented before translating.", tone: "error" } };
    }
    try {
      const existing = session.translations?.find(t => t.language === targetLang);
      const editedFlags = existing?.editedSegmentTranslations || {};

      const segmentsToTranslate = session.segments.filter(seg => !editedFlags[seg.id]);
      const skippedCount = session.segments.length - segmentsToTranslate.length;

      let sourceLang = "auto";

      const results = await Promise.all(
        segmentsToTranslate.map(async (seg) => {
          if (!seg.text?.trim()) return { id: seg.id, text: "" };
          const res = await this.apiService.translate({ text: seg.text, targetLang });
          if (res.sourceLang) sourceLang = res.sourceLang;
          return { id: seg.id, text: res.translatedText };
        })
      );

      const segmentTranslations: Record<string, string> = { ...(existing?.segmentTranslations || {}) };
      results.forEach(r => { segmentTranslations[r.id] = r.text; });

      const translatedFullText = session.segments.map(s => segmentTranslations[s.id] || "").join("");
      const now = Date.now();

      const newTranslation: Translation = {
        language: targetLang,
        text: translatedFullText,
        sourceLang: sourceLang !== "auto" ? sourceLang : (existing?.sourceLang ?? "auto"),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        segmentTranslations,
        editedSegmentTranslations: existing?.editedSegmentTranslations,
        userSpans: existing?.userSpans ?? [],
        apiSpans: existing?.apiSpans ?? [],
        deletedApiKeys: existing?.deletedApiKeys ?? [],
      };

      const translationsPatch = existing
        ? (session.translations || []).map(t => t.language === targetLang ? newTranslation : t)
        : [...(session.translations || []), newTranslation];

      const message = skippedCount > 0
        ? `Translated ${segmentsToTranslate.length} segment(s) to ${targetLang} (${skippedCount} edited skipped).`
        : `Translated document to ${targetLang}.`;

      return {
        ok: true,
        notice: { message, tone: "success" },
        translationsPatch,
        newActiveTab: targetLang,
        editorKey: `${targetLang}:${now}`,
      };
    } catch (error) {
      const appError = this.errorService.handleApiError(error, { operation: "add translation" });
      this.errorService.logError(appError);
      return { ok: false, notice: { message: "Failed to translate document.", tone: "error" } };
    }
  }

  async updateTranslation(
    targetLang: string,
    session: { segments: Segment[]; translations: Translation[] }
  ): Promise<TranslationResult> {
    if (!session.segments || session.segments.length === 0) {
      return { ok: false, notice: { message: "Document must be segmented before translating.", tone: "error" } };
    }
    try {
      const segmentTranslations: Record<string, string> = {};
      let sourceLang = "auto";

      const results = await Promise.all(
        session.segments.map(async (seg) => {
          if (!seg.text?.trim()) return { id: seg.id, text: "" };
          const res = await this.apiService.translate({ text: seg.text, targetLang });
          if (res.sourceLang) sourceLang = res.sourceLang;
          return { id: seg.id, text: res.translatedText };
        })
      );

      results.forEach(r => { segmentTranslations[r.id] = r.text; });

      const translatedFullText = session.segments.map(s => segmentTranslations[s.id] || "").join("");
      const now = Date.now();

      const translationsPatch = (session.translations || []).map(t =>
        t.language === targetLang
          ? {
            ...t,
            text: translatedFullText,
            segmentTranslations,
            sourceLang: sourceLang !== "auto" ? sourceLang : t.sourceLang,
            updatedAt: now
          }
          : t
      );

      return {
        ok: true,
        notice: { message: `Updated ${targetLang} translation.`, tone: "success" },
        translationsPatch,
        editorKey: `${targetLang}:${now}`,
      };
    } catch (error) {
      const appError = this.errorService.handleApiError(error, { operation: "update translation" });
      this.errorService.logError(appError);
      return { ok: false, notice: { message: "Failed to update translation.", tone: "error" } };
    }
  }

  async addSegmentTranslation(
    targetLang: string,
    segmentId: string,
    session: { segments: Segment[]; translations: Translation[] }
  ): Promise<TranslationResult> {
    const seg = session.segments?.find(s => s.id === segmentId);
    if (!seg?.text?.trim()) {
      return { ok: false, notice: { message: "Segment is empty.", tone: "error" } };
    }

    try {
      const res = await this.apiService.translate({ text: seg.text, targetLang });
      const existing = session.translations?.find(t => t.language === targetLang);
      const oldSegTrans = existing?.segmentTranslations || {};
      const updatedSegmentTranslations = { ...oldSegTrans, [segmentId]: res.translatedText };
      const updatedFullText = (session.segments || []).map(s => updatedSegmentTranslations[s.id] || "").join("");
      const now = Date.now();

      const oldText = oldSegTrans[segmentId] || "";
      const oldEnd = SegmentLogic.calculateGlobalOffset(segmentId, session.segments, oldSegTrans) + oldText.length;
      const delta = res.translatedText.length - oldText.length;

      const oldStart = oldEnd - oldText.length;
      let nextUserSpans = existing?.userSpans ?? [];
      let nextApiSpans = existing?.apiSpans ?? [];
      if (oldText.length > 0) {
        nextUserSpans = SpanLogic.removeSpansInRange(nextUserSpans, oldStart, oldEnd);
        nextApiSpans = SpanLogic.removeSpansInRange(nextApiSpans, oldStart, oldEnd);
      }
      nextUserSpans = SpanLogic.shiftSpansFrom(nextUserSpans, oldEnd, delta);
      nextApiSpans = SpanLogic.shiftSpansFrom(nextApiSpans, oldEnd, delta);

      const updatedTranslation: Translation = {
        language: targetLang,
        text: updatedFullText,
        sourceLang: res.sourceLang ?? existing?.sourceLang ?? "auto",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        userSpans: nextUserSpans,
        apiSpans: nextApiSpans,
        deletedApiKeys: existing?.deletedApiKeys ?? [],
        segmentTranslations: updatedSegmentTranslations,
        editedSegmentTranslations: existing?.editedSegmentTranslations,
      };

      const translationsPatch = existing
        ? (session.translations || []).map(t => t.language === targetLang ? updatedTranslation : t)
        : [...(session.translations || []), updatedTranslation];

      return {
        ok: true,
        notice: { message: `Translated segment to ${targetLang}.`, tone: "success" },
        translationsPatch,
        newActiveTab: targetLang,
      };
    } catch (error) {
      const appError = this.errorService.handleApiError(error, { operation: "add segment translation" });
      this.errorService.logError(appError);
      return { ok: false, notice: { message: "Failed to translate segment.", tone: "error" } };
    }
  }

  async updateSegmentTranslation(
    targetLang: string,
    segmentId: string,
    session: { segments: Segment[]; translations: Translation[] }
  ): Promise<TranslationResult> {
    const translation = session.translations?.find(t => t.language === targetLang);
    if (!translation) {
      return { ok: false, notice: { message: "Translation layer not found.", tone: "error" } };
    }

    if (translation.editedSegmentTranslations?.[segmentId]) {
      return { ok: false, notice: { message: "Cannot update a manually edited translation.", tone: "warning" } };
    }

    const seg = session.segments?.find(s => s.id === segmentId);
    if (!seg?.text?.trim()) {
      return { ok: false, notice: { message: "Segment is empty.", tone: "error" } };
    }

    try {
      const res = await this.apiService.translate({ text: seg.text, targetLang });
      const oldSegTrans = translation.segmentTranslations || {};
      const updatedSegmentTranslations = { ...oldSegTrans, [segmentId]: res.translatedText };
      const updatedFullText = (session.segments || []).map(s => updatedSegmentTranslations[s.id] || "").join("");
      const now = Date.now();

      const oldText = oldSegTrans[segmentId] || "";
      const oldStart = SegmentLogic.calculateGlobalOffset(segmentId, session.segments, oldSegTrans);
      const oldEnd = oldStart + oldText.length;
      const delta = res.translatedText.length - oldText.length;

      let nextUserSpans = SpanLogic.removeSpansInRange(translation.userSpans || [], oldStart, oldEnd);
      nextUserSpans = SpanLogic.shiftSpansFrom(nextUserSpans, oldEnd, delta);
      let nextApiSpans = SpanLogic.removeSpansInRange(translation.apiSpans || [], oldStart, oldEnd);
      nextApiSpans = SpanLogic.shiftSpansFrom(nextApiSpans, oldEnd, delta);

      const translationsPatch = (session.translations || []).map(t =>
        t.language === targetLang
          ? {
            ...t,
            segmentTranslations: updatedSegmentTranslations,
            editedSegmentTranslations: { ...(t.editedSegmentTranslations || {}), [segmentId]: false },
            text: updatedFullText,
            sourceLang: res.sourceLang ?? t.sourceLang,
            updatedAt: now,
            userSpans: nextUserSpans,
            apiSpans: nextApiSpans,
          }
          : t
      );

      return {
        ok: true,
        notice: { message: `Updated segment translation (${targetLang}).`, tone: "success" },
        translationsPatch,
      };
    } catch (error) {
      const appError = this.errorService.handleApiError(error, { operation: "update segment translation" });
      this.errorService.logError(appError);
      return { ok: false, notice: { message: "Failed to update segment translation.", tone: "error" } };
    }
  }

  deleteTranslation(
    language: string,
    session: { translations: Translation[]; activeTab: string }
  ): TranslationResult {
    const translationsPatch = (session.translations || []).filter(t => t.language !== language);
    const resetToOriginal = session.activeTab === language;
    return {
      ok: true,
      notice: { message: "Translation deleted.", tone: "success" },
      translationsPatch,
      newActiveTab: resetToOriginal ? "original" : undefined,
    };
  }
}

export const translationWorkflowService = new TranslationWorkflowService();