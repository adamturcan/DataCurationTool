import type { NerSpan, LanguageCode, TranslationRequest, TranslationResponse, Segment } from '../../types';

/** Untyped at the interface level — TaggingWorkflowService defines the concrete shape */
export type ClassificationResult = unknown;

/**
 * Contract for external NLP API calls. Implemented by BrowserApiService
 * which calls the NER, segmentation, classification, and translation endpoints.
 *
 * @category Interfaces
 */
export interface ApiService {
  /** Split text into sentence-level segments via the segmentation API */
  segmentText(text: string): Promise<Segment[]>;
  /** Classify text for semantic tagging */
  classify(text: string): Promise<ClassificationResult>;
  /** Run Named Entity Recognition, returns normalized spans */
  ner(text: string): Promise<NerSpan[]>;
  /** Translate text between languages */
  translate(params: TranslationRequest): Promise<TranslationResponse>;
  /** Retrieve supported translation language codes */
  getSupportedLanguages(): Promise<LanguageCode[]>;
}


