import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Matches,
  MaxLength,
  IsString,
  IsOptional,
} from 'class-validator';
import { IngestUploadedDocumentDto } from './ingest-uploaded-document.dto';

const SUPPORTED_ARTICLE_URL =
  /^https:\/\/school\.jinritemai\.com\/doudian\/web\/article\/[A-Za-z0-9_-]+/i;

export class IngestWebArticleDto extends IngestUploadedDocumentDto {
  @ApiPropertyOptional({
    description: '覆盖自动解析到的文章标题',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  override title?: string;

  @ApiProperty({
    description: '小店课堂文章链接，只支持 doudian/web/article 路径',
    example:
      'https://school.jinritemai.com/doudian/web/article/101829?btm_show_id=example',
  })
  @IsString()
  @MaxLength(500)
  @Matches(SUPPORTED_ARTICLE_URL, {
    message: '仅支持小店课堂文章链接',
  })
  url: string;
}
