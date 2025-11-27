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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiResponse as ApiResponseWrapper,
  buildSuccessResponse,
} from '../common/dto/api-response.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: '创建分类' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(
    @CurrentUser('id') userId: number,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<ApiResponseWrapper<CategoryResponseDto>> {
    const category = await this.categoriesService.create(
      userId,
      createCategoryDto,
    );
    return buildSuccessResponse(
      CategoryResponseDto.fromEntity(category),
      '创建成功',
    );
  }

  @Get()
  @ApiOperation({ summary: '分类列表' })
  async findAll(
    @CurrentUser('id') userId: number,
    @Query() query: QueryCategoryDto,
  ): Promise<ApiResponseWrapper<CategoryResponseDto[]>> {
    const categories = await this.categoriesService.findAll(userId, query);
    return buildSuccessResponse(
      CategoryResponseDto.fromEntities(categories),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '分类详情' })
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseWrapper<CategoryResponseDto>> {
    const category = await this.categoriesService.findOne(userId, id);
    return buildSuccessResponse(CategoryResponseDto.fromEntity(category));
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新分类' })
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ApiResponseWrapper<CategoryResponseDto>> {
    const category = await this.categoriesService.update(
      userId,
      id,
      updateCategoryDto,
    );
    return buildSuccessResponse(
      CategoryResponseDto.fromEntity(category),
      '更新成功',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分类' })
  async remove(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseWrapper<CategoryResponseDto>> {
    const category = await this.categoriesService.remove(userId, id);
    return buildSuccessResponse(
      CategoryResponseDto.fromEntity(category),
      '删除成功',
    );
  }
}
