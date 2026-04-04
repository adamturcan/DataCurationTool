import type { NerSpan } from "../../types";

const keyOfSpan = (s: NerSpan) => `${s.start}:${s.end}:${s.entity}`;

const spansOverlap = (a: NerSpan, b: NerSpan) =>
  a.start < b.end && b.start < a.end;

export type ConflictSource = "user" | "api";

export interface ConflictEntry {
  span: NerSpan;
  snippet: string;
  source: ConflictSource;
}

export interface ConflictPrompt {
  candidate: ConflictEntry;
  conflicts: ConflictEntry[];
  index: number;
  total: number;
}

export interface ResolveApiSpanConflictsParams {
  text: string;
  incomingSpans: NerSpan[];
  userSpans: NerSpan[];
  existingApiSpans: NerSpan[];
  onConflict: (prompt: ConflictPrompt) => Promise<"api" | "existing">;
}

export interface ResolveApiSpanConflictsResult {
  nextUserSpans: NerSpan[];
  nextApiSpans: NerSpan[];
  conflictsHandled: number;
}

export const resolveApiSpanConflicts = async (
  params: ResolveApiSpanConflictsParams
): Promise<ResolveApiSpanConflictsResult> => {
  const { text, incomingSpans, userSpans, existingApiSpans, onConflict } = params;

  let nextUserSpans = [...userSpans];
  const retainedApiMap = new Map<string, NerSpan>();
  existingApiSpans.forEach((span) => {
    retainedApiMap.set(keyOfSpan(span), span);
  });

  const acceptedNewApiSpans: NerSpan[] = [];

  const totalUserConflicts = incomingSpans.reduce((count, candidate) => {
    if (userSpans.some((existing) => spansOverlap(candidate, existing))) {
      return count + 1;
    }
    return count;
  }, 0);

  let conflictIndex = 0;
  let conflictsHandled = 0;

  for (const candidate of incomingSpans) {
    const conflictingUserSpans = nextUserSpans.filter((existing) =>
      spansOverlap(candidate, existing)
    );

    const conflictingApiSpans = Array.from(retainedApiMap.values()).filter((existing) =>
      spansOverlap(candidate, existing)
    );

    if (conflictingUserSpans.length === 0 && conflictingApiSpans.length === 0) {
      acceptedNewApiSpans.push(candidate);
      continue;
    }

    if (conflictingUserSpans.length === 0) {
      const hasEntityChange = conflictingApiSpans.some(
        (existing) => existing.entity !== candidate.entity
      );

      if (!hasEntityChange) {

        conflictingApiSpans.forEach((span) => {
          retainedApiMap.delete(keyOfSpan(span));
        });
        acceptedNewApiSpans.push(candidate);
        continue;
      }

    }

    conflictIndex += 1;
    conflictsHandled += 1;

    const conflictPrompt: ConflictPrompt = {
      candidate: {
        span: candidate,
        snippet: text.slice(candidate.start, candidate.end) || "[empty]",
        source: "api",
      },
      conflicts: [
        ...conflictingUserSpans.map((span) => ({
          span,
          snippet: text.slice(span.start, span.end) || "[empty]",
          source: "user" as const,
        })),
        ...conflictingApiSpans.map((span) => ({
          span,
          snippet: text.slice(span.start, span.end) || "[empty]",
          source: "api" as const,
        })),
      ],
      index: conflictIndex,
      total: totalUserConflicts || conflictIndex,
    };

    const choice = await onConflict(conflictPrompt);

    if (choice === "api") {
      if (conflictingUserSpans.length > 0) {
        const toRemove = new Set(conflictingUserSpans.map((span) => keyOfSpan(span)));
        nextUserSpans = nextUserSpans.filter(
          (existing) => !toRemove.has(keyOfSpan(existing))
        );
      }

      if (conflictingApiSpans.length > 0) {
        conflictingApiSpans.forEach((span) => {
          retainedApiMap.delete(keyOfSpan(span));
        });
      }

      acceptedNewApiSpans.push(candidate);
    }
  }

  const finalApiMap = new Map<string, NerSpan>();
  retainedApiMap.forEach((span, key) => finalApiMap.set(key, span));
  acceptedNewApiSpans.forEach((span) => finalApiMap.set(keyOfSpan(span), span));

  return {
    nextUserSpans,
    nextApiSpans: Array.from(finalApiMap.values()),
    conflictsHandled,
  };
};

