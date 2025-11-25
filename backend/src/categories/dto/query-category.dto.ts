import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryCategoryDto {
    @ApiPropertyOptional({ description: '筛选的用户ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    userId?: number;

    @ApiPropertyOptional({ description: '父分类ID，用于获取指定节点的子级' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    parentId?: number;
}
