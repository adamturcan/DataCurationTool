import type { NerSpan } from "../../../../types";

export const COLORS = { 
  gold: "#DDD1A0", 
  magenta: "#C2185B", 
  dateBlue: "#1976D2", 
  darkBlue: "#21426C", 
  green: "#388E3C" 
};

export const SPLIT_DELIMITERS = ["!", "?", ".", "-", ",", ":"];

export const getSpanId = (s: NerSpan) => s.id ?? `span-${s.start}-${s.end}-${s.entity}`;

export const safeSubstring = (text: string, start: number, end: number) => {
  const s = Number(start); const e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e < 0 || s >= e || s >= text.length) return undefined;
  const out = text.substring(s, Math.min(e, text.length));
  return out.length > 0 ? out : undefined;
};

export const normalizeReplacement = (s: string) => s.replace(/\r\n/g, "\n");