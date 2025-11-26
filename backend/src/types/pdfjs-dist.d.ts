declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export interface PDFOutlineNode {
    title?: string;
    items?: PDFOutlineNode[];
  }

  export interface PDFDocumentProxy {
    getOutline(): Promise<PDFOutlineNode[] | null>;
  }

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(options: {
    url?: string;
    data?: Buffer | Uint8Array | ArrayBuffer;
  }): { promise: Promise<PDFDocumentProxy> };
}
