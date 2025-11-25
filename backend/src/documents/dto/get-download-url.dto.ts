import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetDownloadUrlDto {
  @ApiProperty({ description: '对象存储中的文件 Key' })
  @IsString()
  key: string;

  @ApiProperty({
    description: '签名 URL 的有效期（秒）',
    required: false,
    default: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number;
}
