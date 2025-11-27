import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class GetDocumentIngestionStatusDto {
  @ApiProperty({ description: '文档 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  documentId: number;
}
