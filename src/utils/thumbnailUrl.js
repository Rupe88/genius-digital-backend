/**
 * Normalize thumbnail URLs for storage. Google Drive "view" links are converted to a direct image URL
 * so <img src="..."> works when the file is shared as "Anyone with the link".
 */
export function normalizeThumbnailUrl(input) {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const fileD = raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileD) {
    return `https://drive.google.com/uc?export=view&id=${fileD[1]}`;
  }

  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host === 'drive.google.com' || host.endsWith('.drive.google.com')) {
      const id = u.searchParams.get('id');
      if (id && /^[a-zA-Z0-9_-]+$/.test(id) && u.pathname.includes('/open')) {
        return `https://drive.google.com/uc?export=view&id=${id}`;
      }
    }
  } catch {
    // not a full URL — allow relative paths from caller
  }

  return raw;
}
