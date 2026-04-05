import type { NerSpan, SpanCoordMap } from "../../types";

/**
 * Pure functions for NER span coordinate math. Handles offset translations
 * between global (full text) and local (per-segment) coordinate spaces,
 * and span shifting/removal when text is edited.
 *
 * @category Entities
 */
export const SpanLogic = {

  /** Extracts spans within a segment's range and converts to local (0-based) offsets */
  getLocalSpansForSegment: (
    allSpans: NerSpan[],
    globalStart: number,
    globalEnd: number
  ): NerSpan[] => {
    return allSpans
      .filter((s) => s.start >= globalStart && s.end <= globalEnd)
      .map((s) => ({
        ...s,
        start: s.start - globalStart,
        end: s.end - globalStart
      }));
  },

  /** Updates span positions from CodeMirror's live coordinates, tracking which spans were shifted */
  syncLiveCoords: (
    spans: NerSpan[],
    liveCoords: SpanCoordMap,
    globalOffset: number,
    shiftedSet: Set<string>
  ): NerSpan[] => {
    return spans.map((s) => {
      const id = s.id ?? `span-${s.start}-${s.end}-${s.entity}`;
      const coords = liveCoords.get(id);
      if (coords) {
        shiftedSet.add(id);
        const globalStart = coords.start + globalOffset;
        const globalEnd = coords.end + globalOffset;
        if (s.start !== globalStart || s.end !== globalEnd) {
          return { ...s, start: globalStart, end: globalEnd, id };
        }
      }
      return { ...s, id };
    });
  },

  /** Shifts all spans at or after `boundary` by `delta` character positions */
  shiftSpansFrom: (
    spans: NerSpan[],
    boundary: number,
    delta: number
  ): NerSpan[] => {
    if (delta === 0) return spans;
    return spans.map(s => {
      const newStart = s.start >= boundary ? s.start + delta : s.start;
      const newEnd = s.end >= boundary ? s.end + delta : s.end;
      if (newStart !== s.start || newEnd !== s.end) {
        return { ...s, start: newStart, end: newEnd };
      }
      return s;
    });
  },

  /** Removes spans that overlap the given character range */
  removeSpansInRange: (
    spans: NerSpan[],
    rangeStart: number,
    rangeEnd: number
  ): NerSpan[] => {
    return spans.filter(s => s.end <= rangeStart || s.start >= rangeEnd);
  },

  /** Shifts spans after a text edit, skipping those already handled by syncLiveCoords */
  shiftSpansAfterEdit: (
    spans: NerSpan[],
    editGlobalEndIndex: number,
    lengthDiff: number,
    shiftedSet: Set<string>
  ): NerSpan[] => {
    if (lengthDiff === 0) return spans;
    return spans.map(s => {
      const id = s.id ?? `span-${s.start}-${s.end}-${s.entity}`;
      if (shiftedSet.has(id)) return s;

      let newStart = s.start;
      let newEnd = s.end;
      if (s.start >= editGlobalEndIndex) newStart += lengthDiff;
      if (s.end >= editGlobalEndIndex) newEnd += lengthDiff;

      if (newStart !== s.start || newEnd !== s.end) return { ...s, start: newStart, end: newEnd };
      return s;
    });
  },

  /** Removes overlapping spans and shifts remaining spans for both user and API layers at once */
  removeAndShiftBoth: (
    userSpans: NerSpan[],
    apiSpans: NerSpan[],
    rangeStart: number,
    rangeEnd: number,
    delta: number
  ): { nextUserSpans: NerSpan[]; nextApiSpans: NerSpan[] } => {
    let nextUserSpans = SpanLogic.removeSpansInRange(userSpans, rangeStart, rangeEnd);
    nextUserSpans = SpanLogic.shiftSpansFrom(nextUserSpans, rangeEnd, delta);
    let nextApiSpans = SpanLogic.removeSpansInRange(apiSpans, rangeStart, rangeEnd);
    nextApiSpans = SpanLogic.shiftSpansFrom(nextApiSpans, rangeEnd, delta);
    return { nextUserSpans, nextApiSpans };
  }
};