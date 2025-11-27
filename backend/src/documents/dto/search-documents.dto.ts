import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SearchDocumentsDto {
  @ApiProperty({ description: '需要检索的自然语言描述', minLength: 4 })
  @IsString()
  @MinLength(4)
  query: string;

  @ApiPropertyOptional({
    description: '返回的匹配数量',
    minimum: 1,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}
