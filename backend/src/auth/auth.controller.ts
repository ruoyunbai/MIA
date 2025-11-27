import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiResponse,
  buildSuccessResponse,
} from '../common/dto/api-response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<LoginResponseDto>> {
    const data = await this.authService.login(loginDto);
    return buildSuccessResponse(data, '登录成功');
  }
}
