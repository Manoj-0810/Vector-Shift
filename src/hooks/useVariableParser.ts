/** Hook to parse {{variable}} syntax from text */

import { useMemo } from "react";

const VARIABLE_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function useVariableParser(text: string): string[] {
  return useMemo(() => {
    const matches = [...text.matchAll(VARIABLE_REGEX)];
    return [...new Set(matches.map((m) => m[1]))];
  }, [text]);
}

export function extractVariables(text: string): string[] {
  const matches = [...text.matchAll(VARIABLE_REGEX)];
  return [...new Set(matches.map((m) => m[1]))];
}
