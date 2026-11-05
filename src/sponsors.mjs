export const sponsorChannels = [
  { key: 'afdian', label: '爱发电', url: 'https://raw.githubusercontent.com/honshena/x-lens/main/sponsors/leaderboard.json' },
  { key: 'kofi', label: 'Ko-fi', url: 'https://raw.githubusercontent.com/honshena/x-lens/main/sponsors/kofi.json' },
];

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
