export const SUPPORTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const SUPPORTED_DOCUMENT_MIME_SET = new Set<string>(
  SUPPORTED_DOCUMENT_MIME_TYPES,
);
