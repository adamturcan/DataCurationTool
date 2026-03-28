import type { NerSpan, SpanCoordMap } from "../../../types";

export const SpanLogic = {


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


  /**
   * Shift all spans at or after `boundary` by `delta` positions.
   */
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

  /**
   * Remove spans that overlap the given range.
   */
  removeSpansInRange: (
    spans: NerSpan[],
    rangeStart: number,
    rangeEnd: number
  ): NerSpan[] => {
    return spans.filter(s => s.end <= rangeStart || s.start >= rangeEnd);
  },

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
  }
};