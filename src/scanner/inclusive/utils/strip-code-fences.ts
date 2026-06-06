/**
 * Replaces fenced code blocks and inline code in a markdown string with blank
 * content of the same length so that line numbers remain stable. Used by prose
 * scanners (assumed-knowledge, diminishing) that must not analyse code samples.
 *
 * INI naming-term scanners must NOT use this — `abort`, `whitelist`, etc. must
 * still be flagged inside code fences where they appear as real identifiers.
 */
export function stripCodeFences(content: string): string {
  // Replace fenced blocks (``` ... ```) — preserve newlines so line numbers stay correct
  let stripped = content.replace(/^```[\s\S]*?^```[ \t]*$/gm, (match) =>
    match
      .split('\n')
      .map(() => '')
      .join('\n'),
  );

  // Replace inline code (`...`) with spaces of equal length
  stripped = stripped.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length));

  return stripped;
}
