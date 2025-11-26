import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { GetDownloadUrlDto } from './dto/get-download-url.dto';
import { ParseWebArticleDto } from './dto/parse-web-article.dto';
import { UploadedDocumentFile } from './interfaces/uploaded-document-file.interface';
import type { StorageEngine } from 'multer';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB
const MEMORY_STORAGE: StorageEngine = memoryStorage();

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: '上传 PDF/Word 文档到 COS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        folder: { type: 'string', example: 'merchant-docs' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: MEMORY_STORAGE,
      limits: { fileSize: MAX_UPLOAD_SIZE },
    }),
  )
  uploadDocument(
    @UploadedFile() file: UploadedDocumentFile,
    @Body() payload: UploadDocumentDto,
  ) {
    return this.documentsService.uploadDocument(file, payload.folder);
  }

  @Get('download-url')
  @ApiOperation({ summary: '获取 COS 文档的签名下载链接' })
  getDownloadUrl(@Query() query: GetDownloadUrlDto) {
    return this.documentsService.getDownloadUrl(query.key, query.expiresIn);
  }

  @Post('parse-web-article')
  @ApiOperation({ summary: '解析小店课堂文章为 Markdown/纯文本' })
  parseWebArticle(@Body() payload: ParseWebArticleDto) {
    return this.documentsService.parseWebArticle(payload.url);
  }

  @Post('parse-pdf')
  @ApiOperation({ summary: '解析 PDF 文档为 Markdown/纯文本' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: MEMORY_STORAGE,
      limits: { fileSize: MAX_UPLOAD_SIZE },
    }),
  )
  parsePdf(@UploadedFile() file: UploadedDocumentFile) {
    return this.documentsService.parsePdfDocument(file);
  }

  @Post('parse-word')
  @ApiOperation({ summary: '解析 Word 文档为 Markdown/纯文本' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: MEMORY_STORAGE,
      limits: { fileSize: MAX_UPLOAD_SIZE },
    }),
  )
  parseWord(@UploadedFile() file: UploadedDocumentFile) {
    return this.documentsService.parseWordDocument(file);
  }
}
