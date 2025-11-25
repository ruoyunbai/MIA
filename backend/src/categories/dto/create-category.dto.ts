import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: '分类名称' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: '父分类ID', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    parentId?: number;

    @ApiProperty({ description: '创建者ID', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    userId?: number;

    @ApiProperty({ description: '排序权重', required: false, default: 0, maximum: 9999 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(9999)
    sortOrder?: number;
}
