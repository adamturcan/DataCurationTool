import type { NerSpan, LanguageCode, TranslationRequest, TranslationResponse, Segment } from '../../types';
import type {
  ApiService as ApiServiceContract,
} from '../../core/interfaces/services/ApiService';
import { errorHandlingService } from './ErrorHandlingService';

const NER_ENDPOINT = "https://ner-api.dev.memorise.sdu.dk/recognize";
const SEGMENT_ENDPOINT = "https://textseg-api.dev.memorise.sdu.dk/segment";
const CLASSIFY_ENDPOINT = "https://semtag-api.dev.memorise.sdu.dk/classify";

const TRANSLATION_API_BASE =
  (import.meta.env.VITE_TRANSLATION_API_URL ?? "https://mt-api.dev.memorise.sdu.dk").replace(/\/$/, "");


const FALLBACK_LANGUAGES: LanguageCode[] = [
  "ar", "be", "bg", "bs", "cs", "da", "de", "el", "en", "es", "et", "fa", "fi", "fr", "ga",
  "he", "hi", "hr", "hu", "hy", "it", "jp", "ko", "ku", "lt", "lv", "mk", "mt", "nl", "no",
  "pl", "pt", "ro", "ru", "sk", "sl", "sr", "sv", "tr", "uk", "vi", "yi", "zh",
];


const LANGUAGE_CODE_MAP: Record<string, LanguageCode> = {
  eng: "en",
  ces: "cs",
  dan: "da",
  nld: "nl",
};


/**
 * All external HTTP calls for NER, segmentation, classification,
 * and translation live here. Presentation and workflow services
 * access them via the provider layer.
 */
export class BrowserApiService implements ApiServiceContract {

  private supportedLanguagesCache: LanguageCode[] | null = null;
  private supportedLanguagesSetCache: Set<LanguageCode> | null = null;
  private supportedLanguagesPromise: Promise<LanguageCode[]> | null = null;

  // Classify 

  async classify(text: string): Promise<{ label?: number; name?: string }[]> {
    const context = { operation: "classify text", payloadLength: text.length };

    try {
      const response = await fetch(CLASSIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw errorHandlingService.handleApiError(response, context);
      }

      const data = await response.json();

      return Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.results) ? data.results : [];

    } catch (error) {
      if (errorHandlingService.isAppError(error)) throw error;
      throw errorHandlingService.handleApiError(error, context);
    }
  }

  // NER 

  async ner(text: string): Promise<NerSpan[]> {
    const context = { operation: "run NER", payloadLength: text.length };

    try {
      const response = await fetch(NER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw errorHandlingService.handleApiError(response, context);
      }

      const result = await response.json();
      const rawSpans = Array.isArray(result?.result) ? result.result : [];

      return rawSpans.map((span: { start: number; end: number; type: string; score?: number }) => ({
        start: span.start,
        end: span.end,
        entity: span.type,
        score: typeof span.score === "number" ? span.score : 1,
      }));

    } catch (error) {
      if (errorHandlingService.isAppError(error)) throw error;
      throw errorHandlingService.handleApiError(error, context);
    }
  }

  // Segmentation 

  async segmentText(text: string): Promise<Segment[]> {
    if (!text || text.trim().length === 0) return [];

    const context = { operation: "segment text", payloadLength: text.length };

    try {
      const response = await fetch(SEGMENT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw errorHandlingService.handleApiError(response, context);
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) return [];

      const segments: Segment[] = [];
      let searchStart = 0;

      for (let i = 0; i < data.results.length; i++) {
        const segmentText = data.results[i].sentence_text;
        let segmentStart = text.indexOf(segmentText, searchStart);

        if (segmentStart === -1) {
          segmentStart = text.indexOf(segmentText);
          if (segmentStart === -1) continue;
        }

        const segmentEnd = segmentStart + segmentText.length;
        segments.push({
          id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          start: segmentStart,
          end: segmentEnd,
          order: data.results[i].label,
          text: segmentText
        });

        searchStart = segmentEnd;
      }

      return segments;
    } catch (error) {
      throw errorHandlingService.handleApiError(error, context);
    }
  }

  // Translation 

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    if (!request.text || !request.text.trim()) {
      throw errorHandlingService.handleValidationError(
        "Translation text cannot be empty",
        { operation: "validate translation request", field: "text" }
      );
    }

    if (request.text.length > 50000) {
      throw errorHandlingService.handleValidationError(
        "Translation text too long (max 50,000 characters)",
        { operation: "validate translation request", field: "text", length: request.text.length }
      );
    }

    let targetLang = request.targetLang;
    let sourceLang = request.sourceLang;

    if (LANGUAGE_CODE_MAP[targetLang]) targetLang = LANGUAGE_CODE_MAP[targetLang];
    if (sourceLang && LANGUAGE_CODE_MAP[sourceLang]) sourceLang = LANGUAGE_CODE_MAP[sourceLang];

    const supportedSet = await this.memoizedSupportedLanguagesSet();

    if (!supportedSet.has(targetLang)) {
      throw errorHandlingService.handleValidationError(
        `Unsupported target language: ${targetLang}`,
        { operation: "validate translation request", field: "targetLang", value: targetLang }
      );
    }

    if (sourceLang && !supportedSet.has(sourceLang)) {
      throw errorHandlingService.handleValidationError(
        `Unsupported source language: ${sourceLang}`,
        { operation: "validate translation request", field: "sourceLang", value: sourceLang }
      );
    }

    const endpoint = `${TRANSLATION_API_BASE}/translate`;
    const context = { operation: "translate text", endpoint, targetLang, payloadLength: request.text.length };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tgt_lang: targetLang, text: request.text }),
      });
    } catch (error) {
      throw errorHandlingService.handleApiError(error, context);
    }

    if (!response.ok) {
      throw errorHandlingService.handleApiError(response, context);
    }

    let data: { text?: string };
    try {
      data = (await response.json()) as { text?: string };
    } catch (error) {
      throw errorHandlingService.handleApiError(error, { ...context, operation: "parse translation response" });
    }

    if (!data || typeof data.text !== "string") {
      throw errorHandlingService.handleValidationError(
        "Translation API returned an invalid response",
        { ...context, responseSnapshot: data }
      );
    }

    return {
      translatedText: data.text,
      targetLang,
      sourceLang: sourceLang as LanguageCode | undefined,
    };
  }

  async getSupportedLanguages(): Promise<LanguageCode[]> {
    if (this.supportedLanguagesCache) {
      return this.supportedLanguagesCache;
    }

    if (!this.supportedLanguagesPromise) {
      this.supportedLanguagesPromise = (async () => {
        const endpoint = `${TRANSLATION_API_BASE}/supported_languages`;
        const context = { operation: "fetch supported languages", endpoint };

        try {
          const response = await fetch(endpoint);

          if (!response.ok) {
            throw errorHandlingService.handleApiError(response, context);
          }

          const data = (await response.json()) as { languages?: unknown };
          const languages = Array.isArray(data.languages)
            ? data.languages.filter((lang): lang is LanguageCode => typeof lang === "string")
            : null;

          if (!languages || languages.length === 0) {
            throw errorHandlingService.handleValidationError(
              "Supported languages response malformed",
              { ...context, receivedType: typeof data.languages }
            );
          }

          this.supportedLanguagesCache = languages;
          this.supportedLanguagesSetCache = new Set(languages);
          return languages;

        } catch (error) {
          const appError = errorHandlingService.handleApiError(error, context);
          errorHandlingService.logError(appError, { component: "BrowserApiService.getSupportedLanguages" });
          console.warn("Falling back to bundled supported languages list:", appError.message);

          this.supportedLanguagesCache = [...FALLBACK_LANGUAGES];
          this.supportedLanguagesSetCache = new Set(FALLBACK_LANGUAGES);
          return this.supportedLanguagesCache;
        } finally {
          this.supportedLanguagesPromise = null;
        }
      })();
    }

    return this.supportedLanguagesPromise;
  }

  private async memoizedSupportedLanguagesSet(): Promise<Set<LanguageCode>> {
    if (this.supportedLanguagesSetCache) return this.supportedLanguagesSetCache;
    const languages = await this.getSupportedLanguages();
    this.supportedLanguagesSetCache = new Set(languages);
    return this.supportedLanguagesSetCache;
  }
}
