import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentStatus } from '../../entities';

export class CreateDocumentDto {
  @ApiProperty({
    description: '文档标题',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: '文档原始内容 (Markdown/纯文本)',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '关联的分类 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @ApiPropertyOptional({ description: '创建人/上传人 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number | null;

  @ApiPropertyOptional({
    description: '文档状态',
    enum: DocumentStatus,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'COS 原始文件 URL 或对象 Key',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string | null;

  @ApiPropertyOptional({
    description: '自定义元数据 (作者、标签等)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metaInfo?: Record<string, unknown>;
}
