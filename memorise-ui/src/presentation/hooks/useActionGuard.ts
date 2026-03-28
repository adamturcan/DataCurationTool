import { useState, useCallback } from "react";
import type { ActionGuardDialogProps, ResolutionStep } from "../components/editor/dialogs";
import type { Translation, Segment } from "../../types";

// Gap detection helpers

export type TranslationGap = {
  lang: string;
  segmentId: string;
  segmentOrder: number;
};

/**
 * Detects segments with irregular translation coverage across languages.
 */
function detectIrregularTranslations(
  segmentIds: string[],
  segments: Segment[],
  translations: Translation[]
): TranslationGap[] {
  const gaps: TranslationGap[] = [];
  const orderMap = new Map(segments.map(s => [s.id, s.order]));

  for (const t of translations) {
    const hasList = segmentIds.map(id => !!t.segmentTranslations?.[id]?.trim());
    const someHave = hasList.some(Boolean);
    const allHave = hasList.every(Boolean);

    if (someHave && !allHave) {
      for (let i = 0; i < segmentIds.length; i++) {
        if (!hasList[i]) {
          gaps.push({
            lang: t.language,
            segmentId: segmentIds[i],
            segmentOrder: orderMap.get(segmentIds[i]) ?? i,
          });
        }
      }
    }
  }

  return gaps;
}

/**
 * Finds all segments that have any translation in any language.
 */
function findSegmentTranslations(
  segmentId: string,
  translations: Translation[]
): string[] {
  return translations
    .filter(t => !!t.segmentTranslations?.[segmentId]?.trim())
    .map(t => t.language);
}

/**
 * Finds untranslated segments within a set across all translation layers.
 * Only flags a language when SOME of the affected segments have translations
 * but others don't (inconsistency). If none of the affected segments have
 * translations in a layer, that layer is skipped entirely.
 */
function detectUntranslated(
  segmentIds: string[],
  segments: Segment[],
  translations: Translation[]
): TranslationGap[] {
  const gaps: TranslationGap[] = [];
  const orderMap = new Map(segments.map(s => [s.id, s.order]));

  for (const t of translations) {
    const hasList = segmentIds.map(id => !!t.segmentTranslations?.[id]?.trim());
    const someHave = hasList.some(Boolean);
    const allHave = hasList.every(Boolean);

    // Only flag when there's an inconsistency — some have, some don't
    if (someHave && !allHave) {
      for (let i = 0; i < segmentIds.length; i++) {
        if (!hasList[i]) {
          gaps.push({
            lang: t.language,
            segmentId: segmentIds[i],
            segmentOrder: orderMap.get(segmentIds[i]) ?? 0,
          });
        }
      }
    }
  }

  return gaps;
}

// Hook

export interface ActionGuardActions {
  /** Translate a single segment — injected by the consumer so the hook stays decoupled from services. */
  translateSegment: (segmentId: string, lang: string) => Promise<void>;
  /** Delete a single segment's translation — injected by consumer. */
  deleteSegmentTranslation: (lang: string, segmentId: string) => void;
}

export interface UseActionGuardReturn {
  guardJoin: (
    seg1Id: string,
    seg2Id: string,
    segments: Segment[],
    translations: Translation[],
    onProceed: () => void
  ) => void;

  guardSplit: (
    segmentId: string,
    segments: Segment[],
    translations: Translation[],
    onProceed: () => void
  ) => void;

  guardShift: (
    sourceSegId: string,
    targetPos: number,
    segments: Segment[],
    translations: Translation[],
    onProceed: () => void
  ) => void;

  guardGlobalSplit: (
    segments: Segment[],
    onProceed: () => void
  ) => void;

  dialogProps: ActionGuardDialogProps | null;
  closeDialog: () => void;
}

export function useActionGuard(actions: ActionGuardActions): UseActionGuardReturn {
  const [dialogProps, setDialogProps] = useState<ActionGuardDialogProps | null>(null);

  const closeDialog = useCallback(() => setDialogProps(null), []);

  //Join with irregular translations

  const guardJoin = useCallback(
    (
      seg1Id: string,
      seg2Id: string,
      segments: Segment[],
      translations: Translation[],
      onProceed: () => void
    ) => {
      if (!translations.length) {
        onProceed();
        return;
      }

      const gaps = detectIrregularTranslations([seg1Id, seg2Id], segments, translations);

      if (gaps.length === 0) {
        onProceed();
        return;
      }

      const steps: ResolutionStep[] = gaps.map(gap => ({
        label: `Translate segment ${gap.segmentOrder + 1} → ${gap.lang.toUpperCase()}`,
        action: () => actions.translateSegment(gap.segmentId, gap.lang),
      }));

      setDialogProps({
        open: true,
        onClose: closeDialog,
        mode: "resolution",
        title: "Cannot Join — Missing Translations",
        description:
          "These segments have inconsistent translations across languages. " +
          "Some languages are missing translations for one of the segments. " +
          "Joining them now would result in incomplete translated content.",
        resolutionLabel: "Translate Missing & Join",
        resolutionSteps: steps,
        onResolutionComplete: onProceed,
      });
    },
    [actions, closeDialog]
  );

  // Split with existing translation

  const guardSplit = useCallback(
    (
      segmentId: string,
      segments: Segment[],
      translations: Translation[],
      onProceed: () => void
    ) => {
      const langs = findSegmentTranslations(segmentId, translations);

      if (langs.length === 0) {
        onProceed();
        return;
      }

      const seg = segments.find(s => s.id === segmentId);
      const segLabel = seg ? `segment ${seg.order + 1}` : "this segment";

      const steps: ResolutionStep[] = langs.map(lang => ({
        label: `Delete ${lang.toUpperCase()} translation for ${segLabel}`,
        action: async () => actions.deleteSegmentTranslation(lang, segmentId),
      }));

      setDialogProps({
        open: true,
        onClose: closeDialog,
        mode: "resolution",
        title: "Cannot Split — Translation Exists",
        description:
          `${segLabel.charAt(0).toUpperCase() + segLabel.slice(1)} has translations in: ${langs.map(l => l.toUpperCase()).join(", ")}. ` +
          "Splitting a segment with existing translations would break text alignment. " +
          "The translations must be removed first.",
        resolutionLabel: "Delete Translations & Split",
        resolutionSteps: steps,
        onResolutionComplete: onProceed,
      });
    },
    [actions, closeDialog]
  );

  // Shift boundary with untranslated parts

  const guardShift = useCallback(
    (
      sourceSegId: string,
      targetPos: number,
      segments: Segment[],
      translations: Translation[],
      onProceed: () => void
    ) => {
      if (!translations.length) {
        onProceed();
        return;
      }

      // Determine affected segments: the source and any segments between
      // source boundary and the target position
      const source = segments.find(s => s.id === sourceSegId);
      if (!source) {
        onProceed();
        return;
      }

      const sourceBoundary = source.end;
      const minPos = Math.min(sourceBoundary, targetPos);
      const maxPos = Math.max(sourceBoundary, targetPos);

      const affectedIds = segments
        .filter(s => {
          return s.start < maxPos && s.end > minPos;
        })
        .map(s => s.id);

      const gaps = detectUntranslated(affectedIds, segments, translations);

      if (gaps.length === 0) {
        onProceed();
        return;
      }

      const steps: ResolutionStep[] = gaps.map(gap => ({
        label: `Translate segment ${gap.segmentOrder + 1} → ${gap.lang.toUpperCase()}`,
        action: () => actions.translateSegment(gap.segmentId, gap.lang),
      }));

      setDialogProps({
        open: true,
        onClose: closeDialog,
        mode: "resolution",
        title: "Cannot Shift — Untranslated Segments in Path",
        description:
          `Shifting this boundary affects ${affectedIds.length} segment(s). ` +
          "Some are missing translations. The shift will merge content, " +
          "and untranslated gaps would create inconsistent results.",
        resolutionLabel: "Translate Missing & Shift",
        resolutionSteps: steps,
        onResolutionComplete: onProceed,
      });
    },
    [actions, closeDialog]
  );

  // Global API split prevention

  const guardGlobalSplit = useCallback(
    (segments: Segment[], onProceed: () => void) => {
      if (segments.length > 1) {
        setDialogProps({
          open: true,
          onClose: closeDialog,
          mode: "block",
          title: "Document Already Segmented",
          description:
            "Auto-segmentation has already been performed on this document. " +
            "Running it again is not allowed.",
        });
        return;
      }

      onProceed();
    },
    [closeDialog]
  );

  return {
    guardJoin,
    guardSplit,
    guardShift,
    guardGlobalSplit,
    dialogProps,
    closeDialog,
  };
}
