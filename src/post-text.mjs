export function summarizePostText(text, limit = 1000) {
  const characters = Array.from(text);
  const truncated = characters.length > limit;
  return {
    preview: truncated ? characters.slice(0, limit).join('') : text,
    length: characters.length,
    shown: Math.min(characters.length, limit),
    truncated,
  };
}
