import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiResponse,
  buildSuccessResponse,
} from '../common/dto/api-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RequestVerificationDto } from './dto/request-verification.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.create(createUserDto);
    return buildSuccessResponse(user, '注册成功');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @CurrentUser() user: UserResponseDto,
  ): ApiResponse<UserResponseDto> {
    return buildSuccessResponse(user);
  }

  @Post('request-verification')
  async requestVerification(
    @Body() dto: RequestVerificationDto,
  ): Promise<ApiResponse<null>> {
    await this.usersService.requestEmailVerification(dto);
    return buildSuccessResponse(null, '验证码已发送');
  }
}
