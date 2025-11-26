import { readFileSync } from 'fs';
import { join } from 'path';
import { WordDocumentParserService } from '../word-document-parser.service';
import { UploadedDocumentFile } from '../../interfaces/uploaded-document-file.interface';

describe('WordDocumentParserService', () => {
  let service: WordDocumentParserService;
  let docxFile: UploadedDocumentFile;
  let docFile: UploadedDocumentFile;

  beforeAll(() => {
    const docxBuffer = readFileSync(
      join(__dirname, 'fixtures', 'sample-word.docx'),
    );
    docxFile = {
      fieldname: 'file',
      originalname: 'word.docx',
      encoding: '7bit',
      mimetype:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxBuffer,
      size: docxBuffer.length,
    };

    const docBuffer = readFileSync(
      join(__dirname, 'fixtures', 'sample-word.doc'),
    );
    docFile = {
      fieldname: 'file',
      originalname: 'word.doc',
      encoding: '7bit',
      mimetype: 'application/msword',
      buffer: docBuffer,
      size: docBuffer.length,
    };
  });

  beforeEach(() => {
    service = new WordDocumentParserService();
  });

  it('parses DOCX files via mammoth', async () => {
    const result = await service.parse(docxFile);
    expect(result.markdown).toContain('店铺命名规范指南');
    expect(result.plainText).toContain('流程说明');
    expect(result.metadata.title).toBe('word');
  });

  it('uses decoded filename for DOCX metadata when name is latin1 encoded', async () => {
    const corrupted = Buffer.from(
      '基于深度学习的流程规范.docx',
      'utf8',
    ).toString('latin1');
    const result = await service.parse({
      ...docxFile,
      originalname: corrupted,
    });
    expect(result.metadata.title).toBe('基于深度学习的流程规范');
  });

  it('parses legacy DOC files via word-extractor', async () => {
    const result = await service.parse(docFile);
    expect(result.plainText).toContain('店铺命名规范指南');
    expect(result.markdown).toContain('店铺命名规范指南');
  });
});
