import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { EmailVerificationService } from '../email/email-verification.service';
import { RequestVerificationDto } from './dto/request-verification.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const normalizedEmail = createUserDto.email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('邮箱已被注册');
    }

    await this.emailVerificationService.consumeCode(
      normalizedEmail,
      createUserDto.verificationCode,
    );

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const now = new Date();

    const user = this.usersRepository.create({
      email: normalizedEmail,
      name: createUserDto.name ?? normalizedEmail.split('@')[0] ?? '新用户',
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: now,
    });

    try {
      const saved = await this.usersRepository.save(user);
      return this.toResponseDto(saved);
    } catch (error) {
      const cause = error instanceof Error ? error : undefined;
      throw new InternalServerErrorException('创建用户失败，请稍后重试', {
        cause,
      });
    }
  }

  async requestEmailVerification(dto: RequestVerificationDto): Promise<void> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }

    await this.emailVerificationService.sendVerificationCode(
      normalizedEmail,
      dto.name,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? undefined,
      emailVerified: Boolean(user.emailVerified),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
