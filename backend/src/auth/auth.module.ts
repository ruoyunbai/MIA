import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtOrDebugGuard } from './guards/optional-jwt-or-debug.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresInValue = configService.get<string>('JWT_EXPIRES_IN');
        const parsedExpiresIn = Number.parseInt(expiresInValue ?? '3600', 10);
        const expiresIn = Number.isNaN(parsedExpiresIn)
          ? 3600
          : parsedExpiresIn;

        return {
          secret: configService.get<string>('JWT_SECRET', 'change-me'),
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OptionalJwtOrDebugGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, OptionalJwtOrDebugGuard],
})
export class AuthModule {}
