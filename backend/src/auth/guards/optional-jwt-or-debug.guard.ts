import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Injectable()
export class OptionalJwtOrDebugGuard extends AuthGuard('jwt') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      query: Record<string, unknown>;
      body: Record<string, unknown>;
      user?: UserResponseDto;
    }>();
    const debugKey = this.configService.get<string>('MIA_DEBUG_BYPASS_KEY');
    const headerKey = request.headers?.['x-debug-key'];
    const providedKey =
      (typeof request.query?.debugKey === 'string'
        ? request.query.debugKey
        : undefined) ||
      (typeof headerKey === 'string' ? headerKey : undefined) ||
      (typeof request.body?.debugKey === 'string'
        ? request.body.debugKey
        : undefined);
    if (
      debugKey &&
      typeof providedKey === 'string' &&
      providedKey === debugKey
    ) {
      request.user = this.buildDebugUser(request);
      return true;
    }
    return super.canActivate(context);
  }

  private buildDebugUser(request: {
    query?: Record<string, unknown>;
  }): UserResponseDto {
    const rawQueryUserId = request.query?.debugUserId;
    const parsedQueryUserId =
      typeof rawQueryUserId === 'string' ? Number(rawQueryUserId) : undefined;
    const queryUserId =
      parsedQueryUserId !== undefined && Number.isFinite(parsedQueryUserId)
        ? parsedQueryUserId
        : undefined;
    const fallbackUserIdRaw = Number(
      this.configService.get<string>('MIA_DEBUG_USER_ID'),
    );
    const fallbackUserId = Number.isFinite(fallbackUserIdRaw)
      ? fallbackUserIdRaw
      : undefined;
    const id = queryUserId ?? fallbackUserId ?? 0;
    return {
      id,
      name: 'Swagger Debugger',
      email: 'debug@example.com',
      emailVerified: false,
      avatarUrl: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
