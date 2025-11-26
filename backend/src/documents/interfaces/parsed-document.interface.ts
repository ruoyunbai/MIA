export interface DocumentOutlineItem {
  title: string;
  level: number;
  anchor: string;
}

export interface ParsedDocumentMetadata {
  title?: string;
  sourceUrl?: string;
  parser: string;
  extractedAt: string;
  wordCount: number;
}

export interface ParsedDocument {
  markdown: string;
  plainText: string;
  outline: DocumentOutlineItem[];
  metadata: ParsedDocumentMetadata;
}
