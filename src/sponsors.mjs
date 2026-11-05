export function normalizeSponsors(data) {
  if (!Array.isArray(data?.sponsors)) return [];
  return data.sponsors.flatMap((entry) => {
    if (typeof entry?.name !== 'string' || !entry.name.trim()) return [];
    let avatar = '';
    try {
      const url = new URL(entry.avatar);
      if (url.protocol === 'https:' && !url.username && !url.password) avatar = url.href;
    } catch { avatar = ''; }
    return [{ name: entry.name.trim().slice(0, 80), avatar }];
  });
}
