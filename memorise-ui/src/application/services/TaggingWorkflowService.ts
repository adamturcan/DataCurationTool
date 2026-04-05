import { getApiService } from "../../infrastructure/providers/apiProvider";
import { errorHandlingService } from "../../infrastructure/services/ErrorHandlingService";
import { loadThesaurusIndex } from "../../shared/utils/thesaurusHelpers";
import type { ThesaurusIndexItem, TagItem, Segment, TranslationDTO, WorkflowResult } from "../../types";


type ClassificationResult = WorkflowResult & {
  tags?: TagItem[];
}



/**
 * Semantic tagging operations: run API classification, add/delete user tags.
 * Tags are scoped per segment (or whole document if no active segment).
 *
 * @category Application
 */
export class TaggingWorkflowService {
  private apiService = getApiService();

  private getContextId(id?: string | null): string | undefined {
    return (!id || id === "root") ? undefined : id;
  }


  async runClassify(forceGlobal: boolean = false, session: { activeSegmentId: string | undefined, segments: Segment[], draftText: string, translations: TranslationDTO[], text: string, activeTab: string, tags: TagItem[] }): Promise<ClassificationResult> {

    const { activeTab, activeSegmentId, segments, translations, text, draftText, tags } = session;

    const targetSegmentId = forceGlobal ? undefined : this.getContextId(activeSegmentId);
    let textToProcess = "";

    if (targetSegmentId) {
      const targetSeg = segments?.find(s => s.id === targetSegmentId);
      textToProcess = activeTab === "original"
        ? targetSeg?.text || ""
        : translations?.find(t => t.language === activeTab)?.segmentTranslations?.[targetSegmentId] || "";
    } else {

      const hasSegments = segments && segments.length > 0;

      if (activeTab === "original") {
        textToProcess = hasSegments
          ? segments!.map(s => s.text).join("\n\n")
          : text || draftText || "";
      } else {
        const tLayer = translations?.find(t => t.language === activeTab);
        textToProcess = hasSegments && tLayer?.segmentTranslations
          ? segments!.map(s => tLayer.segmentTranslations![s.id] || "").join("\n\n")
          : tLayer?.text || "";
      }
    }

    if (!textToProcess.trim()) {
      return { ok: false, notice: { message: "No text to classify.", tone: "error" } };
    }

    try {
      const apiResults = await this.apiService.classify(textToProcess);

      let thesaurusIndex: ThesaurusIndexItem[] = [];
      try { thesaurusIndex = await loadThesaurusIndex(); }
      catch (e) { errorHandlingService.logError(e, { operation: "load thesaurus index" }); }

      const allTags = tags ?? [];
      const contextUserTags = allTags.filter((t) => t.source === "user" && t.segmentId === targetSegmentId);
      const newTags: TagItem[] = [];

      for (const r of apiResults as { label?: number; name?: string; }[]) {
        if (!r.name) continue;
        if (contextUserTags.some((t) => t.name.toLowerCase() === r.name!.toLowerCase())) continue;

        if (r.label && thesaurusIndex.length > 0) {
          const matches = thesaurusIndex.filter((item) => item.id === r.label);
          if (matches.length > 0) {
            for (const match of matches) {
              const exists = contextUserTags.some((t) =>
                t.name.toLowerCase() === match.label.toLowerCase() && t.label === match.id && t.parentId === match.parentId
              );
              if (!exists) newTags.push({ name: match.label, source: "api", label: match.id, parentId: match.parentId, segmentId: targetSegmentId });
            }
          } else {
            newTags.push({ name: r.name, source: "api", label: r.label, segmentId: targetSegmentId });
          }
        } else {
          newTags.push({ name: r.name, source: "api", label: r.label, segmentId: targetSegmentId });
        }
      }

      const filteredTags = allTags.filter((t) => {
        const isApi = t.source === "api";
        const belongsToCurrentContext = t.segmentId === targetSegmentId;
        if (isApi && belongsToCurrentContext) return false;
        return true;
      });

      return { ok: true, notice: { message: "Classification completed.", tone: "success" }, tags: [...filteredTags, ...newTags] };

    } catch (error) {
      const appError = errorHandlingService.handleApiError(error, { operation: "classify text" });
      errorHandlingService.logError(appError);
      return { ok: false, notice: { message: appError.message, tone: "error" } };
    }
  }

  async addCustomTag(name: string, options?: { keywordId?: number; parentId?: number; segmentId?: string | null }, tags?: TagItem[]): Promise<ClassificationResult> {
    const tag = name.trim();
    if (!tag) return { ok: false, notice: { message: "Tag name is empty", tone: "error" } };

    try {
      const allTags = tags ?? [];
      const targetSegId = this.getContextId(options?.segmentId);

      const exists = allTags.some((t) => {
        const nameMatch = t.name.toLowerCase() === tag.toLowerCase();
        const segmentMatch = t.segmentId === targetSegId;

        if (!t.label && !options?.keywordId) return nameMatch && segmentMatch;
        if (t.label && options?.keywordId) return nameMatch && t.label === options.keywordId && t.parentId === options.parentId && segmentMatch;
        return false;
      });

      if (exists) return { ok: false, notice: { message: "This tag already exists in this segment", tone: "error" } };

      const newTag: TagItem = {
        name: tag,
        source: "user",
        label: options?.keywordId,
        parentId: options?.parentId,
        segmentId: targetSegId,
      };

      return { ok: true, notice: { message: "Tag added successfully.", tone: "success" }, tags: [newTag, ...allTags] };
    } catch (error) {
      const appError = errorHandlingService.handleApiError(error, { operation: "add custom tag" });
      errorHandlingService.logError(appError);
      return { ok: false, notice: { message: appError.message, tone: "error" } };
    }
  }

  deleteTag(name: string, keywordId?: number, parentId?: number, tags?: TagItem[], activeSegmentId?: string): ClassificationResult {

    const targetSegId = this.getContextId(activeSegmentId);
    const allTags = tags ?? [];

    const filteredTags = allTags.filter((t) => {
      const belongsToCurrentContext = t.segmentId === targetSegId;
      if (!belongsToCurrentContext) return true;

      const nameMatch = t.name.toLowerCase() === name.toLowerCase();
      if (!t.label && !keywordId) return !nameMatch;
      if (t.label && keywordId) return !(nameMatch && t.label === keywordId && t.parentId === parentId);

      return true;
    });

    return { ok: true, notice: { message: "Tag deleted successfully.", tone: "success" }, tags: filteredTags };
  }
}

export const taggingWorkflowService = new TaggingWorkflowService();