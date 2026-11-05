export function shortcutMatches(event, shortcut) {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop();
  return event.key?.toLowerCase() === key
    && Boolean(event.ctrlKey) === parts.includes('ctrl')
    && Boolean(event.altKey) === parts.includes('alt')
    && Boolean(event.shiftKey) === parts.includes('shift')
    && Boolean(event.metaKey) === parts.includes('meta');
}

export function hasForeignText(text) {
  return /[^\p{Script=Han}\p{P}\p{N}\p{Z}\p{S}\s]/u.test(text);
}
