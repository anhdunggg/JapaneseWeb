export function isPlaceholderImage(url) {
  if (!url) return true;

  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('placehold.co');
  } catch {
    return false;
  }
}

export function getPlaceholderLabel(url, fallback = '') {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('text') || fallback;
  } catch {
    return fallback;
  }
}
