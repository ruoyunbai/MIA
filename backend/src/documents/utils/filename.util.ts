const INVALID_TITLE_VALUE = /^blob$/i;
const CONTROL_CHAR_RANGE = String.raw`\u0000-\u001F\u007F-\u009F`;
const CONTROL_CHAR_TEST_REGEX = new RegExp(`[${CONTROL_CHAR_RANGE}]`);
const CONTROL_CHAR_REPLACE_REGEX = new RegExp(`[${CONTROL_CHAR_RANGE}]`, 'g');
const READABLE_CHAR_REGEX = /[\u4e00-\u9fa5A-Za-z0-9]/;
const MIME_WORD_REGEX = /=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/;
const REPLACEMENT_CHAR_REGEX = /\uFFFD/g;

export function normalizeUploadedFilename(filename?: string) {
  if (!filename) {
    return '';
  }
  const trimmed = filename.trim();
  if (!trimmed || INVALID_TITLE_VALUE.test(trimmed)) {
    return '';
  }
  const base = stripExtension(trimmed);
  const normalizedBase = normalizeCandidate(base);
  if (normalizedBase && isReadableTitle(normalizedBase) && !looksEncoded(base)) {
    return normalizedBase;
  }
  const candidates = buildCandidates(trimmed);
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    if (isReadableTitle(normalized)) {
      return normalized;
    }
  }
  if (normalizedBase && isReadableTitle(normalizedBase)) {
    return normalizedBase;
  }
  return '';
}

export function isReadableTitle(value?: string | null) {
  if (!value) {
    return false;
  }
  if (value.includes('\uFFFD')) {
    return false;
  }
  if (CONTROL_CHAR_TEST_REGEX.test(value)) {
    return false;
  }
  return READABLE_CHAR_REGEX.test(value);
}

function decodeLatin1(value: string) {
  try {
    const buffer = Buffer.from(value, 'latin1');
    const decoded = buffer.toString('utf8').trim();
    if (decoded) {
      return decoded;
    }
  } catch {
    // ignore, fallback to original value
  }
  return value;
}

function buildCandidates(value: string) {
  const percentDecoded = stripExtension(decodePercentEncoded(value));
  const mimeDecoded = stripExtension(decodeMimeEncodedWord(value));
  const decodedLatin1 = stripExtension(decodeLatin1(value));
  return [percentDecoded, mimeDecoded, decodedLatin1];
}

function stripExtension(value: string) {
  return value.replace(/\.[^.]+$/, '').trim();
}

function normalizeCandidate(value: string) {
  if (!value) {
    return '';
  }
  return value
    .replace(REPLACEMENT_CHAR_REGEX, '')
    .replace(CONTROL_CHAR_REPLACE_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksEncoded(value: string) {
  if (!value) {
    return false;
  }
  if (/%[a-fA-F0-9]{2}/.test(value)) {
    return true;
  }
  if (value.includes('=?')) {
    return true;
  }
  return false;
}

function decodePercentEncoded(value: string) {
  if (!value || !/%[a-fA-F0-9]{2}/.test(value)) {
    return '';
  }
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return '';
  }
}

function decodeMimeEncodedWord(value: string) {
  const match = value.match(MIME_WORD_REGEX);
  if (!match) {
    return '';
  }
  const [, charset, encoding, body] = match;
  if (!/utf-?8/i.test(charset)) {
    return '';
  }
  try {
    if (encoding.toUpperCase() === 'B') {
      return Buffer.from(body, 'base64').toString('utf8');
    }
    return Buffer.from(
      decodeQuotedPrintable(body.replace(/_/g, ' ')),
      'latin1',
    ).toString('utf8');
  } catch {
    return '';
  }
}

function decodeQuotedPrintable(value: string) {
  return value.replace(/=([a-fA-F0-9]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
