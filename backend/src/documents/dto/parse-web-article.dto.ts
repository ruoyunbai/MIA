import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class ParseWebArticleDto {
  @ApiProperty({
    description: '文章链接（当前仅支持小店课堂域名）',
    example: 'https://school.jinritemai.com/doudian/web/article/aHrB3YpUeySR',
  })
  @IsUrl({ require_tld: true }, { message: '请提供合法的文章链接' })
  @IsNotEmpty()
  url!: string;
}
