export function embedKey(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}${parsed.hash}`;
  } catch {
    return "";
  }
}
