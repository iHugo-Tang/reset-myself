export function calculateEffectiveLength(text: string): number {
  let processed = text;

  // Remove mentions: @username (preceded by start or whitespace)
  // We match the preceding character to ensure it's a boundary, but we put it back.
  processed = processed.replace(/(^|\s)@[a-zA-Z0-9_]+/g, '$1');

  // Remove URLs: http://... or https://... (preceded by start or whitespace)
  processed = processed.replace(/(^|\s)https?:\/\/[^\s]+/g, '$1');

  return processed.length;
}

