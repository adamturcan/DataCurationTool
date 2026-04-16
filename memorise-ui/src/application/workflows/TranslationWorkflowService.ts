import { getApiService } from "../../infrastructure/providers/apiProvider";
import { catchApiError } from "../errors";
import { SegmentLogic } from "../../core/entities/SegmentLogic";
import { SpanLogic } from "../../core/entities/SpanLogic";
import type { TranslationDTO, Segment, WorkflowResult } from "../../types";

type TranslationResult = WorkflowResult & {
  translationsPatch?: TranslationDTO[];
  newActiveTab?: string;
  editorKey?: string;
};

/**
 * Translation operations: add a full translation page, translate/update/delete
 * individual segments. All methods return TranslationResult with a translations
 * patch for the session store.
 *
 * @category Application
 */
export class TranslationWorkflowService {
  private apiService = getApiService();

  private async translateWholeDocument(
    targetLang: string,
    fullText: string,
    existing: TranslationDTO | undefined,
    allTranslations: TranslationDTO[]
  ): Promise<TranslationResult> {
    const res = await this.apiService.translate({ text: fullText, targetLang });
    const now = Date.now();
    const newTranslation: TranslationDTO = {
      language: targetLang,
      text: res.translatedText,
      sourceLang: res.sourceLang ?? existing?.sourceLang ?? "auto",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      segmentTranslations: {},
      editedSegmentTranslations: existing?.editedSegmentTranslations,
      userSpans: existing?.userSpans ?? [],
      apiSpans: existing?.apiSpans ?? [],
      deletedApiKeys: existing?.deletedApiKeys ?? [],
    };
    const translationsPatch = existing
      ? allTranslations.map(t => t.language === targetLang ? newTranslation : t)
      : [...allTranslations, newTranslation];
    return {
      ok: true,
      notice: { message: `Translated document to ${targetLang}.`, tone: "success" },
      translationsPatch,
      newActiveTab: targetLang,
      editorKey: `${targetLang}:${now}`,
    };
  }

  async addTranslation(
    targetLang: string,
    session: { segments: Segment[]; translations: TranslationDTO[]; text?: string }
  ): Promise<TranslationResult> {
    if (!session.segments || session.segments.length === 0) {
      const fullText = session.text || "";
      if (!fullText.trim()) {
        return { ok: false, notice: { message: "Document has no text to translate.", tone: "error" } };
      }
      try {
        const existing = session.translations?.find(t => t.language === targetLang);
        return await this.translateWholeDocument(targetLang, fullText, existing, session.translations || []);
      } catch (error) {
        return catchApiError(error, "add translation", "Failed to translate document.");
      }
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

      const newTranslation: TranslationDTO = {
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
      return catchApiError(error, "add translation", "Failed to translate document.");
    }
  }

  async addSegmentTranslation(
    targetLang: string,
    segmentId: string,
    session: { segments: Segment[]; translations: TranslationDTO[]; text?: string }
  ): Promise<TranslationResult> {
    if (segmentId === "root") {
      const fullText = session.text || "";
      if (!fullText.trim()) {
        return { ok: false, notice: { message: "Document has no text to translate.", tone: "error" } };
      }
      try {
        const existing = session.translations?.find(t => t.language === targetLang);
        return await this.translateWholeDocument(targetLang, fullText, existing, session.translations || []);
      } catch (error) {
        return catchApiError(error, "add translation", "Failed to translate document.");
      }
    }

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
        ({ nextUserSpans, nextApiSpans } = SpanLogic.removeAndShiftBoth(nextUserSpans, nextApiSpans, oldStart, oldEnd, delta));
      } else {
        nextUserSpans = SpanLogic.shiftSpansFrom(nextUserSpans, oldEnd, delta);
        nextApiSpans = SpanLogic.shiftSpansFrom(nextApiSpans, oldEnd, delta);
      }

      const updatedTranslation: TranslationDTO = {
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
      return catchApiError(error, "add segment translation", "Failed to translate segment.");
    }
  }

  async updateSegmentTranslation(
    targetLang: string,
    segmentId: string,
    session: { segments: Segment[]; translations: TranslationDTO[] }
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

      const { nextUserSpans, nextApiSpans } = SpanLogic.removeAndShiftBoth(
        translation.userSpans || [], translation.apiSpans || [], oldStart, oldEnd, delta
      );

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
      return catchApiError(error, "update segment translation", "Failed to update segment translation.");
    }
  }

  /** Removes a single segment's translation and adjusts spans accordingly */
  deleteSegmentTranslation(
    lang: string,
    segmentId: string,
    session: { segments: Segment[]; translations: TranslationDTO[] }
  ): TranslationResult {
    const currentLayer = session.translations?.find(t => t.language === lang);
    if (!currentLayer) {
      return { ok: false, notice: { message: "Translation layer not found.", tone: "error" } };
    }

    const oldSegTrans = currentLayer.segmentTranslations || {};
    const deletedText = oldSegTrans[segmentId] || "";
    const deletedStart = SegmentLogic.calculateGlobalOffset(segmentId, session.segments, oldSegTrans);
    const deletedEnd = deletedStart + deletedText.length;

    const newSegs = { ...oldSegTrans };
    delete newSegs[segmentId];

    const newFullText = session.segments.map(s => newSegs[s.id] || "").join("");

    const { nextUserSpans, nextApiSpans } = SpanLogic.removeAndShiftBoth(
      currentLayer.userSpans || [], currentLayer.apiSpans || [], deletedStart, deletedEnd, -deletedText.length
    );

    const translationsPatch = session.translations.map(t =>
      t.language === lang
        ? { ...t, segmentTranslations: newSegs, text: newFullText, userSpans: nextUserSpans, apiSpans: nextApiSpans }
        : t
    );

    return {
      ok: true,
      notice: { message: "Segment translation deleted.", tone: "success" },
      translationsPatch,
    };
  }
}

export const translationWorkflowService = new TranslationWorkflowService();
