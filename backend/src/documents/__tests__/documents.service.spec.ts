import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';
import * as dotenv from 'dotenv';
import { DocumentsService } from '../documents.service';
import { UploadedDocumentFile } from '../interfaces/uploaded-document-file.interface';
import { WebArticleParserService } from '../parsers/web-article-parser.service';
import { PdfDocumentParserService } from '../parsers/pdf-document-parser.service';
import { WordDocumentParserService } from '../parsers/word-document-parser.service';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const samplePdfPath = path.resolve(
  __dirname,
  '../../../public/店铺命名规范.pdf',
);

const shouldRunCosIntegration =
  process.env.COS_INTEGRATION_TEST === 'true' ||
  process.env.RUN_COS_TEST === 'true';
const describeDocuments = shouldRunCosIntegration ? describe : describe.skip;

describeDocuments('DocumentsService (COS integration)', () => {
  let service: DocumentsService;
  const uploadedKeys: string[] = [];

  beforeAll(() => {
    service = new DocumentsService(
      new ConfigService(),
      new WebArticleParserService(),
      new PdfDocumentParserService(),
      new WordDocumentParserService(),
    );
  });

  afterAll(async () => {
    if (!uploadedKeys.length) {
      return;
    }
    const secretId = process.env.COS_SECRET_ID;
    const secretKey = process.env.COS_SECRET_KEY;
    const bucket = process.env.COS_BUCKET;
    const region = process.env.COS_REGION;
    if (!secretId || !secretKey || !bucket || !region) {
      return;
    }
    const client = new COS({ SecretId: secretId, SecretKey: secretKey });
    await Promise.all(
      uploadedKeys.map(
        (Key) =>
          new Promise<void>((resolve) =>
            client.deleteObject({ Bucket: bucket, Region: region, Key }, () =>
              resolve(),
            ),
          ),
      ),
    );
  });

  it('uploads a PDF to COS and returns a working signed url', async () => {
    const buffer = fs.readFileSync(samplePdfPath);
    const file: UploadedDocumentFile = {
      fieldname: 'file',
      originalname: path.basename(samplePdfPath),
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer,
      size: buffer.length,
    };

    const result = await service.uploadDocument(file, 'integration-tests');
    uploadedKeys.push(result.key);

    expect(result.key).toContain('integration-tests');
    expect(result.url).toMatch(/^https?:\/\//);
    expect(result.size).toBe(buffer.length);
  });

  it('generates a signed download url for an existing object key', async () => {
    const buffer = fs.readFileSync(samplePdfPath);
    const uploadResult = await service.uploadDocument(
      {
        fieldname: 'file',
        originalname: 'download-test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer,
        size: buffer.length,
      },
      'integration-tests',
    );
    uploadedKeys.push(uploadResult.key);

    const signed = await service.getDownloadUrl(uploadResult.key, 120);
    expect(signed.url).toMatch(/^https?:\/\//);
  });
});
