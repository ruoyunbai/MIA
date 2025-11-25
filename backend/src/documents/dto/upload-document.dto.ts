import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'COS 中的存储目录',
    required: false,
    example: 'merchant-docs',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;

  @ApiProperty({
    description: '文档标题，将与元数据一同入库 (可选)',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
