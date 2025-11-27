import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { DocumentIngestionStatus, DocumentStatus } from '../../entities';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiPropertyOptional({
    description: '关联分类 ID，传 null 解除关联',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  declare categoryId?: number | null;

  @ApiPropertyOptional({
    description: '归属用户 ID，传 null 解除关联',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  declare userId?: number | null;

  @ApiPropertyOptional({
    description: '文档状态',
    enum: DocumentStatus,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  declare status?: DocumentStatus;

  @ApiPropertyOptional({
    description: '手动调整入库状态',
    enum: DocumentIngestionStatus,
  })
  @IsOptional()
  @IsEnum(DocumentIngestionStatus)
  ingestionStatus?: DocumentIngestionStatus;
}
