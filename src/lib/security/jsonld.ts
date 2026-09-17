/**
 * Safely serializes an object to a JSON-LD script string.
 * Escapes characters that could be used for HTML or script-tag breakouts:
 * '<' -> \u003c
 * '>' -> \u003e
 * '&' -> \u0026
 * \u2028 (Line Separator) -> \u2028
 * \u2029 (Paragraph Separator) -> \u2029
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
