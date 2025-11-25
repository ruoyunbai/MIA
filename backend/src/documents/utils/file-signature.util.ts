export enum DocumentFileType {
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
}

const PDF_SIGNATURE = Buffer.from('%PDF-');
const DOC_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
const DOCX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export function detectDocumentType(buffer: Buffer): DocumentFileType | null {
  if (isPdf(buffer)) {
    return DocumentFileType.PDF;
  }
  if (isDoc(buffer)) {
    return DocumentFileType.DOC;
  }
  if (isDocx(buffer)) {
    return DocumentFileType.DOCX;
  }
  return null;
}

function isPdf(buffer: Buffer) {
  if (buffer.length < PDF_SIGNATURE.length) {
    return false;
  }
  return buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);
}

function isDoc(buffer: Buffer) {
  if (buffer.length < DOC_SIGNATURE.length) {
    return false;
  }
  return buffer.subarray(0, DOC_SIGNATURE.length).equals(DOC_SIGNATURE);
}

function isDocx(buffer: Buffer) {
  if (buffer.length < DOCX_SIGNATURE.length) {
    return false;
  }
  return buffer.subarray(0, DOCX_SIGNATURE.length).equals(DOCX_SIGNATURE);
}
