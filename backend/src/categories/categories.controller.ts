import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Post()
    @ApiOperation({ summary: '创建分类' })
    @ApiResponse({ status: 201, description: '创建成功' })
    create(@Body() createCategoryDto: CreateCategoryDto) {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    @ApiOperation({ summary: '分类列表' })
    findAll(@Query() query: QueryCategoryDto) {
        return this.categoriesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: '分类详情' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: '更新分类' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: '删除分类' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.remove(id);
    }
}
