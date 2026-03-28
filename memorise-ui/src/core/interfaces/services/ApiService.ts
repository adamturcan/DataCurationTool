import type { NerSpan, LanguageCode, TranslationRequest, TranslationResponse, Segment } from '../../../types';

export type ClassificationResult = unknown;

export interface ApiService {

  segmentText(text: string): Promise<Segment[]>;

  /**
   * Classify text (semantic tagging / categorisation).
   */
  classify(text: string): Promise<ClassificationResult>;

  /**
   * Run Named Entity Recognition and return normalised spans.
   */
  ner(text: string): Promise<NerSpan[]>;

  /**
   * Translate text between languages.
   */
  translate(params: TranslationRequest): Promise<TranslationResponse>;

  /**
   * Retrieve supported translation languages.
   */
  getSupportedLanguages(): Promise<LanguageCode[]>;
}


