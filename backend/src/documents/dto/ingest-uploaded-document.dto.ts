import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentChunkStrategyType } from '../documents.types';

export class IngestUploadedDocumentDto {
  @ApiPropertyOptional({
    description: '文档标题，未填写时将使用解析结果推断',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '关联的分类 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: '上传的用户 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: '切片策略: fixed/paragraph/section/sliding-window',
    enum: DocumentChunkStrategyType,
    example: DocumentChunkStrategyType.FIXED,
  })
  @IsOptional()
  @IsEnum(DocumentChunkStrategyType)
  chunkStrategy?: DocumentChunkStrategyType;

  @ApiPropertyOptional({
    description: '固定/滑窗切片尺寸（字符数）',
    example: 800,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  chunkSize?: number;

  @ApiPropertyOptional({
    description: '固定切片重叠字符数',
    example: 160,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  chunkOverlap?: number;

  @ApiPropertyOptional({
    description: '段落切片的最小字符数，不足时自动合并',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paragraphMinLength?: number;

  @ApiPropertyOptional({
    description: '滑窗切片窗口步长（字符数）',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  slidingWindowStep?: number;

  @ApiPropertyOptional({
    description: '滑窗切片窗口大小（字符数），默认与 chunkSize 一致',
    example: 800,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  slidingWindowSize?: number;

  @ApiPropertyOptional({
    description: '预检索的短语，返回时会附带相似度查询结果',
    minLength: 4,
    maxLength: 200,
    example: '上传文件拖动到我的坚果云',
  })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  previewQuery?: string;
}
