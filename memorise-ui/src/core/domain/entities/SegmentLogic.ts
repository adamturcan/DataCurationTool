import type { Segment } from "../../../types";

export const SegmentLogic = {

  calculateGlobalOffset: (
    segmentId: string,
    segments: Segment[],
    translations?: Record<string, string>
  ): number => {
    if (!translations) {
      const seg = segments.find(s => s.id === segmentId);
      return seg ? seg.start : 0;
    }

    let offset = 0;
    for (const s of segments) {
      if (s.id === segmentId) break;
      offset += (translations[s.id] || "").length;
    }
    return offset;
  },

  calculateVirtualBoundaries: (
    masterSegments: Segment[],
    segmentTranslations: Record<string, string>
  ): Segment[] => {
    let currentOffset = 0;

    return masterSegments.map(seg => {
      const translatedText = segmentTranslations[seg.id] || "";
      const start = currentOffset;
      const end = start + translatedText.length;
      currentOffset = end;
      return { ...seg, start, end, text: translatedText };
    });
  },


  joinMasterSegments: (segments: Segment[], id1: string, id2: string): Segment[] | null => {
    const segment1 = segments.find((s) => s.id === id1);
    const segment2 = segments.find((s) => s.id === id2);

    if (!segment1 || !segment2) return null;

    const isConsecutive =
      segment1.end === segment2.start ||
      segment1.end + 1 === segment2.start ||
      (segment1.end < segment2.start && segment2.start - segment1.end <= 1);

    if (!isConsecutive) return null;

    const joinedSegment: Segment = {
      id: id1,
      start: segment1.start,
      end: segment2.end,
      order: segment1.order,
      text: segment1.text + (segment1.end < segment2.start ? " " : "") + segment2.text,
    };

    return segments
      .filter((s) => s.id !== id2)
      .map((s) => (s.id === id1 ? joinedSegment : s))
      .sort((a, b) => a.start - b.start)
      .map((s, index) => ({ ...s, order: index }));
  },

  joinSegmentTranslations: (
    segmentTranslations: Record<string, string> | undefined,
    id1: string,
    id2: string,
  ): Record<string, string> => {
    const dict = { ...(segmentTranslations || {}) };
    const text1 = dict[id1] || "";
    const text2 = dict[id2] || "";

    if (text1 || text2) {
      dict[id1] = text1 + (text1 && text2 ? " " : "") + text2;
    }

    delete dict[id2];

    return dict;
  },


  split: (
    segments: Segment[],
    toSplitId: string,
    position: number,
    fullText: string
  ): Segment[] | null => {
    const segmentIndex = segments.findIndex((s) => s.id === toSplitId);
    if (segmentIndex === -1) return null;

    const toSplit = segments[segmentIndex];

    if (position <= toSplit.start || position >= toSplit.end) return null;

    const isSpace = fullText[position] === " " || fullText[position] === "\n";
    const relativePos = position - toSplit.start;

    const firstSegment: Segment = {
      ...toSplit,
      end: position,
      text: toSplit.text.substring(0, relativePos),
    };

    const newStartPos = isSpace ? position + 1 : position;
    const secondRelativePos = isSpace ? relativePos + 1 : relativePos;

    const secondSegment: Segment = {
      id: crypto.randomUUID(),
      start: newStartPos,
      end: toSplit.end,
      order: toSplit.order + 1,
      text: toSplit.text.substring(secondRelativePos),
    };

    return [
      ...segments.slice(0, segmentIndex),
      firstSegment,
      secondSegment,
      ...segments.slice(segmentIndex + 1),
    ].map((s, index) => ({ ...s, order: index }));
  },

  updateSegmentAndShift: (
    segments: Segment[],
    editedSegmentId: string,
    newSegmentEnd: number,
    lengthDiff: number,
    oldSegmentEnd: number
  ): Segment[] => {
    if (lengthDiff === 0) {
      return segments.map(s =>
        s.id === editedSegmentId ? { ...s, end: newSegmentEnd } : s
      );
    }

    return segments.map((segment) => {
      if (segment.id === editedSegmentId) {
        return { ...segment, end: newSegmentEnd };
      }

      if (segment.start > oldSegmentEnd) {
        return {
          ...segment,
          start: segment.start + lengthDiff,
          end: segment.end + lengthDiff,
        };
      }

      if (segment.start === oldSegmentEnd) {
        return {
          ...segment,
          start: newSegmentEnd + 1,
          end: segment.end + lengthDiff,
        };
      }

      return segment;
    });
  },

  shiftSegmentBoundary: (
    segments: Segment[],
    sourceSegmentId: string,
    globalTargetPosition: number,
    fullText: string
  ): Segment[] | null => {
    const sourceIndex = segments.findIndex((s) => s.id === sourceSegmentId);
    if (sourceIndex === -1) {
      return null;
    }

    const sourceSegment = segments[sourceIndex];
    if (globalTargetPosition <= sourceSegment.start) {
      return null;
    }
    if (globalTargetPosition === sourceSegment.end) {
      return null;
    }

    if (globalTargetPosition > sourceSegment.end) {

      const targetIndex = segments.findIndex(
        (s) => globalTargetPosition >= s.start && globalTargetPosition <= s.end
      );

      if (targetIndex === -1) {
        if (globalTargetPosition === fullText.length) {
          const lastSeg = segments[segments.length - 1];
          if (sourceSegment.id === lastSeg.id) return null;

          const mergedSegment: Segment = {
            ...sourceSegment,
            end: fullText.length,
            text: fullText.substring(sourceSegment.start, fullText.length),
          };

          return [
            ...segments.slice(0, sourceIndex),
            mergedSegment,
          ].map((s, index) => ({ ...s, order: index }));
        }
        return null;
      }

      const targetSegment = segments[targetIndex];

      const newSourceSegment: Segment = {
        ...sourceSegment,
        end: globalTargetPosition,
        text: fullText.substring(sourceSegment.start, globalTargetPosition),
      };

      let nextSegments: Segment[] = [];


      if (globalTargetPosition === targetSegment.end) {
        nextSegments = [
          ...segments.slice(0, sourceIndex),
          newSourceSegment,
          ...segments.slice(targetIndex + 1),
        ];
      } else if (globalTargetPosition === targetSegment.start) {
        nextSegments = [
          ...segments.slice(0, sourceIndex),
          newSourceSegment,
          targetSegment,
          ...segments.slice(targetIndex + 1),
        ];
      } else {
        const shrunkTargetSegment: Segment = {
          ...targetSegment,
          start: globalTargetPosition,
          text: fullText.substring(globalTargetPosition, targetSegment.end),
        };

        nextSegments = [
          ...segments.slice(0, sourceIndex),
          newSourceSegment,
          shrunkTargetSegment,
          ...segments.slice(targetIndex + 1),
        ];
      }

      return nextSegments.map((s, index) => ({ ...s, order: index }));
    }
    else if (globalTargetPosition < sourceSegment.end) {
      if (sourceIndex === segments.length - 1) return null;

      const expandingSegment = segments[sourceIndex + 1];
      const targetIndex = segments.findIndex(
        (s) => globalTargetPosition >= s.start && globalTargetPosition <= s.end
      );

      if (targetIndex === -1 || targetIndex > sourceIndex) return null;

      const targetSegment = segments[targetIndex];

      const expandedNextSegment: Segment = {
        ...expandingSegment,
        start: globalTargetPosition,
        text: fullText.substring(globalTargetPosition, expandingSegment.end),
      };

      let nextSegments: Segment[] = [];

      if (globalTargetPosition === targetSegment.start) {
        nextSegments = [
          ...segments.slice(0, targetIndex),
          expandedNextSegment,
          ...segments.slice(sourceIndex + 2),
        ];
      } else {
        const shrunkTargetSegment: Segment = {
          ...targetSegment,
          end: globalTargetPosition,
          text: fullText.substring(targetSegment.start, globalTargetPosition),
        };

        nextSegments = [
          ...segments.slice(0, targetIndex),
          shrunkTargetSegment,
          expandedNextSegment,
          ...segments.slice(sourceIndex + 2),
        ];
      }

      return nextSegments.map((s, index) => ({ ...s, order: index }));
    }

    return null;
  }
};