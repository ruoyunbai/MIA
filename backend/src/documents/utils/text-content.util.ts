import { DocumentOutlineItem } from '../interfaces/parsed-document.interface';

const CHINESE_NUMERAL = '一二三四五六七八九十百千';
const MAX_OUTLINE_ITEMS = 100;
const NULL_CHAR_REGEX = new RegExp(String.raw`\u0000`, 'g');

export function normalizePlainText(input: string) {
  if (!input) {
    return '';
  }
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .replace(NULL_CHAR_REGEX, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeMarkdown(input: string) {
  if (!input) {
    return '';
  }
  return input.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function plainTextToMarkdown(plainText: string) {
  if (!plainText) {
    return '';
  }
  const paragraphs = plainText
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  return paragraphs
    .map((paragraph) => {
      if (/^[-*•●·]/.test(paragraph)) {
        return `- ${paragraph.replace(/^[-*•●·]+\s*/, '')}`;
      }
      return paragraph;
    })
    .join('\n\n');
}

export function buildOutlineFromPlainText(plainText: string) {
  const lines = plainText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const anchors = new Map<string, number>();
  const outline: DocumentOutlineItem[] = [];

  for (const line of lines) {
    const level = detectHeadingLevel(line);
    if (!level) {
      continue;
    }
    const title = normalizeHeadingTitle(line);
    if (!title) {
      continue;
    }
    const anchor = ensureUniqueAnchor(slugify(title), anchors);
    outline.push({ title, level, anchor });
    if (outline.length >= MAX_OUTLINE_ITEMS) {
      break;
    }
  }
  return outline;
}

export function buildOutlineFromMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const anchors = new Map<string, number>();
  const outline: DocumentOutlineItem[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (!match) {
      continue;
    }
    const level = match[1].length;
    const title = match[2].trim();
    if (!title) {
      continue;
    }
    const anchor = ensureUniqueAnchor(slugify(title), anchors);
    outline.push({ title, level, anchor });
    if (outline.length >= MAX_OUTLINE_ITEMS) {
      break;
    }
  }

  if (outline.length) {
    return outline;
  }
  return buildOutlineFromPlainText(markdown);
}

function detectHeadingLevel(line: string) {
  if (new RegExp(`^第[${CHINESE_NUMERAL}]+章`).test(line)) {
    return 1;
  }
  if (new RegExp(`^第[${CHINESE_NUMERAL}]+节`).test(line)) {
    return 2;
  }
  const numericMatch = line.match(/^(\d+(?:\.\d+){0,3})/);
  if (numericMatch) {
    return Math.min(6, numericMatch[1].split('.').length);
  }
  if (/^[A-Z][A-Z0-9\s-]{3,}$/.test(line)) {
    return 1;
  }
  if (/^[\u4e00-\u9fa5]{2,12}$/.test(line)) {
    return 2;
  }
  return 0;
}

function normalizeHeadingTitle(line: string) {
  return (
    line
      .replace(new RegExp(`^第[${CHINESE_NUMERAL}]+[章节部]\\s*`), '')
      .replace(/^\d+(?:\.\d+)*[、．.\s]*/, '')
      .replace(/^[（(]?[一二三四五六七八九十]+[)）．、\s]*/, '')
      .trim() || line.trim()
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function ensureUniqueAnchor(anchor: string, anchors: Map<string, number>) {
  const count = anchors.get(anchor) ?? 0;
  anchors.set(anchor, count + 1);
  if (count === 0) {
    return anchor;
  }
  return `${anchor}-${count}`;
}
