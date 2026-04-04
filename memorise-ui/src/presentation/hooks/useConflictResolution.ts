import { useCallback, useRef, useState } from "react";
import { type ConflictPrompt } from "../../core/services/resolveApiSpanConflicts";

export function useConflictResolution() {
  const [conflictPrompt, setConflictPrompt] = useState<ConflictPrompt | null>(null);
  const conflictResolverRef = useRef<((choice: "api" | "existing") => void) | null>(null);
  
  const requestConflictResolution = useCallback((prompt: ConflictPrompt) =>
    new Promise<"api" | "existing">((resolve) => {
      conflictResolverRef.current = resolve;
      setConflictPrompt(prompt);
    }), []);
  
  const resolveConflictPrompt = useCallback((choice: "api" | "existing") => {
    conflictResolverRef.current?.(choice);
    conflictResolverRef.current = null;
    setConflictPrompt(null);
  }, []);

  return {
    conflictPrompt,
    requestConflictResolution,
    resolveConflictPrompt,
  };
}
