declare module 'pdf-parse' {
  interface PdfParseOptions {
    max?: number;
    version?: string;
  }

  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info?: {
      Title?: string;
      Author?: string;
      [key: string]: unknown;
    };
    metadata?: unknown;
    text: string;
    version?: string;
  }

  function pdf(
    data: Buffer | Uint8Array,
    options?: PdfParseOptions,
  ): Promise<PdfParseResult>;

  export = pdf;
}
