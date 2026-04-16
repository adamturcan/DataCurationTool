import { describe, it, expect, vi } from "vitest";

import type { NerSpan } from '../types/NotationEditor';
import {
  resolveApiSpanConflicts,
  type ConflictPrompt,
} from '../core/services/resolveApiSpanConflicts';

const buildSpan = (start: number, end: number, entity: string): NerSpan => ({
  start,
  end,
  entity,
});

describe("resolveApiSpanConflicts", () => {
  const sampleText = "Lorem ipsum dolor sit amet";

  it("returns new API spans when no overlaps exist", async () => {
    const incoming = [buildSpan(0, 5, "PER"), buildSpan(6, 11, "LOC")];

    const handler = vi.fn();

    const result = await resolveApiSpanConflicts({
      text: sampleText,
      incomingSpans: incoming,
      userSpans: [],
      existingApiSpans: [],
      onConflict: handler,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.nextUserSpans).toEqual([]);
    expect(result.nextApiSpans).toHaveLength(2);
    expect(result.conflictsHandled).toBe(0);
  });

  it("keeps existing API spans when only API conflicts occur", async () => {
    const existingApi = [buildSpan(0, 5, "PER")];
    const incoming = [buildSpan(0, 5, "PER")];

    const handler = vi.fn();

    const result = await resolveApiSpanConflicts({
      text: sampleText,
      incomingSpans: incoming,
      userSpans: [],
      existingApiSpans: existingApi,
      onConflict: handler,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.nextApiSpans).toEqual(existingApi);
    expect(result.conflictsHandled).toBe(0);
  });

  it("keeps user spans when handler chooses existing", async () => {
    const userSpans = [buildSpan(0, 5, "PER")];
    const incoming = [buildSpan(0, 5, "ORG")];

    const handler = vi.fn().mockResolvedValue("existing" as const);

    const result = await resolveApiSpanConflicts({
      text: sampleText,
      incomingSpans: incoming,
      userSpans,
      existingApiSpans: [],
      onConflict: handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.nextUserSpans).toEqual(userSpans);
    expect(result.nextApiSpans).toEqual([]);
    expect(result.conflictsHandled).toBe(1);
  });

  it("replaces user spans when handler chooses api", async () => {
    const userSpans = [buildSpan(0, 5, "PER")];
    const incoming = [buildSpan(0, 5, "ORG")];

    const handler = vi.fn().mockResolvedValue("api" as const);

    const result = await resolveApiSpanConflicts({
      text: sampleText,
      incomingSpans: incoming,
      userSpans,
      existingApiSpans: [],
      onConflict: handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.nextUserSpans).toEqual([]);
    expect(result.nextApiSpans).toHaveLength(1);
    expect(result.conflictsHandled).toBe(1);
  });

  it("evaluates conflicts sequentially with correct metadata", async () => {
    const userSpans = [buildSpan(0, 5, "PER"), buildSpan(6, 11, "LOC")];
    const incoming = [
      buildSpan(0, 5, "ORG"),
      buildSpan(6, 11, "PER"),
    ];

    const handler = vi
      .fn<(prompt: ConflictPrompt) => Promise<"api" | "existing">>()
      .mockImplementation(async (prompt) => {
        if (prompt.index === 1) return "api";
        return "existing";
      });

    const result = await resolveApiSpanConflicts({
      text: sampleText,
      incomingSpans: incoming,
      userSpans,
      existingApiSpans: [],
      onConflict: handler,
    });

    expect(handler).toHaveBeenCalledTimes(2);
    const firstPrompt = handler.mock.calls[0][0];
    const secondPrompt = handler.mock.calls[1][0];

    expect(firstPrompt.index).toBe(1);
    expect(firstPrompt.total).toBe(2);
    expect(firstPrompt.candidate.span).toEqual(incoming[0]);

    expect(secondPrompt.index).toBe(2);
    expect(secondPrompt.total).toBe(2);
    expect(secondPrompt.candidate.span).toEqual(incoming[1]);

    expect(result.nextUserSpans).toHaveLength(1);
    expect(result.nextApiSpans).toHaveLength(1);
    expect(result.conflictsHandled).toBe(2);
  });
});

