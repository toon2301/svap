export type LinkifiedMessageSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string };

const MESSAGE_URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/gi;
const TRAILING_URL_PUNCTUATION = /[),.;:!?"'\]}>]+$/;

function normalizeMessageUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.replace(TRAILING_URL_PUNCTUATION, '');
  const candidate = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function linkifyMessageText(text: string): LinkifiedMessageSegment[] {
  if (!text) {
    return [];
  }

  const segments: LinkifiedMessageSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MESSAGE_URL_REGEX)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const display = raw.replace(TRAILING_URL_PUNCTUATION, '');

    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }

    const href = normalizeMessageUrl(display);
    if (href) {
      segments.push({ type: 'link', value: display, href });
    } else {
      segments.push({ type: 'text', value: display });
    }

    lastIndex = start + display.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}
