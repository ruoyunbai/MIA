import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      toResponseDto: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should return token and profile for valid credentials', async () => {
    const password = 'StrongPassword123';
    const hash = await bcrypt.hash(password, 10);
    const user = {
      id: 1,
      email: 'demo@example.com',
      name: 'demo',
      passwordHash: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Parameters<UsersService['toResponseDto']>[0];

    usersService.findByEmailWithPassword?.mockResolvedValue(user);
    usersService.toResponseDto?.mockReturnValue({
      id: 1,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    jwtService.signAsync?.mockResolvedValue('signed-token');

    const result = await service.login({ email: user.email, password });

    expect(result.token).toBe('signed-token');
    expect(result.user.email).toBe(user.email);
    expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
      user.email,
    );
    expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
  });

  it('should throw when credentials are invalid', async () => {
    usersService.findByEmailWithPassword?.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'unknown@example.com',
        password: 'incorrect',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
