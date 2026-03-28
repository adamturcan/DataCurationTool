// src/shared/utils/pdfHelpers.ts
import type { NerSpan } from "../../types";
import { ENTITY_COLORS } from "../constants/notationEditor";

/**
 * Convert hex color to RGB array for PDF rendering
 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

/**
 * Get RGB color for an entity type
 */
export function getEntityRgb(entity: string): [number, number, number] {
  const hex = ENTITY_COLORS[entity] ?? "#607D8B"; // Default to MISC color
  return hexToRgb(hex);
}

/**
 * Text segment with annotation information
 */
export type AnnotatedTextSegment = {
  text: string;
  entity?: string;
  color?: [number, number, number];
  isSegmentBorder?: boolean; // Whether this text is a segment border (at segment.end position)
  segmentId?: string; // ID of the segment this border belongs to (for hyperlinks)
};

/**
 * Process text with annotations and segment highlights into segments for PDF rendering
 * Returns an array of text segments, each with optional annotation and segment styling
 */
export function processAnnotatedText(
  text: string,
  spans: NerSpan[],
  deletedKeys?: string[],
  segments?: Array<{ start: number; end: number; id?: string }>
): AnnotatedTextSegment[] {
  if (!spans || spans.length === 0) {
    return [{ text }];
  }

  // Filter out deleted spans
  const activeSpans = spans.filter((span) => {
    if (!deletedKeys) return true;
    const key = `${span.start}:${span.end}:${span.entity}`;
    return !deletedKeys.includes(key);
  });

  // Sort spans by start position and filter invalid spans
  const sortedSpans = [...activeSpans]
    .filter((span) => {
      // Validate span indices
      return (
        span.start >= 0 &&
        span.end > span.start &&
        span.start < text.length &&
        span.end <= text.length
      );
    })
    .sort((a, b) => a.start - b.start);

  // Map segment border positions to segment IDs (segment.end positions)
  const segmentBorderMap = new Map<number, string>();
  if (segments && segments.length > 0) {
    segments.forEach(seg => {
      if (seg.end > 0 && seg.end <= text.length) {
        segmentBorderMap.set(seg.end, seg.id || `segment-${seg.start}-${seg.end}`);
      }
    });
  }

  // Helper function to get segment ID for a border position
  const getSegmentIdForBorder = (pos: number): string | undefined => {
    return segmentBorderMap.get(pos);
  };

  // Create segments - ensure we cover the entire text without gaps or overlaps
  const resultSegments: AnnotatedTextSegment[] = [];
  let currentPos = 0;

  for (const span of sortedSpans) {
    // Skip if span is completely before current position (already processed)
    if (span.end <= currentPos) continue;

    // Handle overlapping spans - only process the part we haven't covered yet
    const spanStart = Math.max(span.start, currentPos);
    const spanEnd = span.end;

    // Add text before this span (or before the unprocessed part)
    if (spanStart > currentPos) {
      const beforeText = text.substring(currentPos, spanStart);
      // Include text, preserving all characters including spaces
      if (beforeText.length > 0) {
        // Check each character for segment borders
        let segmentStart = 0;
        for (let i = 0; i < beforeText.length; i++) {
          const globalPos = currentPos + i;
          const segmentId = getSegmentIdForBorder(globalPos);
          if (segmentId) {
            // Add text before border
            if (i > segmentStart) {
              resultSegments.push({ text: beforeText.substring(segmentStart, i) });
            }
            // Add border character with segment ID
            resultSegments.push({ text: beforeText[i], isSegmentBorder: true, segmentId });
            segmentStart = i + 1;
          }
        }
        // Add remaining text after last border
        if (segmentStart < beforeText.length) {
          resultSegments.push({ text: beforeText.substring(segmentStart) });
        }
      }
    }

    // Add annotated text (only the unprocessed part)
    const spanText = text.substring(spanStart, spanEnd);
    if (spanText.length > 0) {
      // Check each character for segment borders
      let segmentStart = 0;
      for (let i = 0; i < spanText.length; i++) {
        const globalPos = spanStart + i;
        const segmentId = getSegmentIdForBorder(globalPos);
        if (segmentId) {
          // Add text before border
          if (i > segmentStart) {
            resultSegments.push({
              text: spanText.substring(segmentStart, i),
              entity: span.entity,
              color: getEntityRgb(span.entity),
            });
          }
          // Add border character (with entity annotation if it's part of the span)
          resultSegments.push({
            text: spanText[i],
            entity: span.entity,
            color: getEntityRgb(span.entity),
            isSegmentBorder: true,
            segmentId,
          });
          segmentStart = i + 1;
        }
      }
      // Add remaining text after last border
      if (segmentStart < spanText.length) {
        resultSegments.push({
          text: spanText.substring(segmentStart),
          entity: span.entity,
          color: getEntityRgb(span.entity),
        });
      }
    }

    currentPos = Math.max(currentPos, spanEnd);
  }

  // Add remaining text after last span - always include to ensure no text is lost
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    // Check each character for segment borders
    let segmentStart = 0;
    for (let i = 0; i < remainingText.length; i++) {
      const globalPos = currentPos + i;
      const segmentId = getSegmentIdForBorder(globalPos);
      if (segmentId) {
        // Add text before border
        if (i > segmentStart) {
          resultSegments.push({ text: remainingText.substring(segmentStart, i) });
        }
        // Add border character with segment ID
        resultSegments.push({ text: remainingText[i], isSegmentBorder: true, segmentId });
        segmentStart = i + 1;
      }
    }
    // Add remaining text after last border
    if (segmentStart < remainingText.length) {
      resultSegments.push({ text: remainingText.substring(segmentStart) });
    }
  }

  // If no spans, return the full text as a single segment (check for segment borders)
  if (resultSegments.length === 0) {
    // Check each character for segment borders
    let segmentStart = 0;
    for (let i = 0; i < text.length; i++) {
      const segmentId = getSegmentIdForBorder(i);
      if (segmentId) {
        // Add text before border
        if (i > segmentStart) {
          resultSegments.push({ text: text.substring(segmentStart, i) });
        }
        // Add border character with segment ID
        resultSegments.push({ text: text[i], isSegmentBorder: true, segmentId });
        segmentStart = i + 1;
      }
    }
    // Add remaining text after last border
    if (segmentStart < text.length) {
      resultSegments.push({ text: text.substring(segmentStart) });
    }
    // If no borders found, add entire text
    if (resultSegments.length === 0) {
      resultSegments.push({ text });
    }
  }

  return resultSegments;
}

/**
 * Format date for display
 */
export function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString();
}

/**
 * Get entity display name
 */
export function getEntityDisplayName(entity: string): string {
  const names: Record<string, string> = {
    PER: "Person",
    PERS: "Person",
    LOC: "Location",
    DATE: "Date",
    ORG: "Organization",
    CAMP: "Camp",
    GHETTO: "Ghetto",
    MISC: "Miscellaneous",
  };
  return names[entity] ?? entity;
}

