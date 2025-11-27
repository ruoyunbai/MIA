import { readFileSync } from 'fs';
import { join } from 'path';
import pdfParse from 'pdf-parse';
import { PdfDocumentParserService } from '../pdf-document-parser.service';
import { UploadedDocumentFile } from '../../interfaces/uploaded-document-file.interface';
import type { DocumentOutlineItem } from '../../interfaces/parsed-document.interface';

jest.mock('pdf-parse', () => jest.fn());

describe('PdfDocumentParserService', () => {
  let service: PdfDocumentParserService;
  let sampleFile: UploadedDocumentFile;
  const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;
  type PdfParserInternals = {
    extractOutlineFromPdf: (
      buffer: Buffer,
    ) => Promise<DocumentOutlineItem[] | null>;
  };
  let internals: PdfParserInternals;

  beforeAll(() => {
    const buffer = readFileSync(join(__dirname, 'fixtures', 'sample.pdf'));
    sampleFile = {
      fieldname: 'file',
      originalname: 'sample.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer,
      size: buffer.length,
    };
  });

  beforeEach(() => {
    service = new PdfDocumentParserService();
    internals = service as unknown as PdfParserInternals;
    mockPdfParse.mockResolvedValue({
      text: 'Sample PDF Content',
      numpages: 1,
      numrender: 1,
      info: { Title: 'sample' },
      metadata: undefined,
      version: '1.7',
    } as Awaited<ReturnType<typeof pdfParse>>);
  });

  it('parses pdf buffer into markdown/plain text', async () => {
    jest.spyOn(internals, 'extractOutlineFromPdf').mockResolvedValue(null);
    const result = await service.parse(sampleFile);
    expect(result.plainText).toContain('Sample PDF Content');
    expect(result.markdown).toContain('Sample PDF Content');
    expect(result.metadata.title).toBe('sample');
    expect(result.metadata.wordCount).toBeGreaterThan(5);
  });

  it('falls back to decoded filename when originalname is latin1 encoded', async () => {
    jest.spyOn(internals, 'extractOutlineFromPdf').mockResolvedValue(null);
    const corrupted = Buffer.from(
      '基于深度学习的视频插帧研究进展.pdf',
      'utf8',
    ).toString('latin1');
    const fileWithCorruptedName = {
      ...sampleFile,
      originalname: corrupted,
    };
    const result = await service.parse(fileWithCorruptedName);
    expect(result.metadata.title).toBe('基于深度学习的视频插帧研究进展');
  });
});
