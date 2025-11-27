import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerification } from './entities/email-verification.entity';
import { EmailVerificationTemplate } from './templates/email-verification.template';
import { EmailService } from './email.service';
import type { ReactEmailTemplate } from './interfaces/email-message.interface';

const RESEND_INTERVAL_SECONDS = 60;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(EmailVerification)
    private readonly verificationRepository: Repository<EmailVerification>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationCode(email: string, name?: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await this.ensureRecord(normalizedEmail);
    if (record.lastSentAt) {
      const diffSeconds = (Date.now() - record.lastSentAt.getTime()) / 1000;
      if (diffSeconds < RESEND_INTERVAL_SECONDS) {
        throw new BadRequestException(
          `验证码发送过于频繁，请在 ${Math.ceil(
            RESEND_INTERVAL_SECONDS - diffSeconds,
          )} 秒后重试`,
        );
      }
    }

    const code = this.generateCode();
    const expiresInMinutes = this.getExpireMinutes();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const displayName = name?.trim() || normalizedEmail.split('@')[0] || '用户';

    record.code = code;
    record.name = displayName;
    record.expiresAt = expiresAt;
    record.lastSentAt = new Date();

    await this.verificationRepository.save(record);

    const textLines = this.buildText(displayName, code, expiresInMinutes);

    await this.emailService.sendEmail({
      to: normalizedEmail,
      subject: 'MIA 邮箱验证码',
      text: textLines.join('\n'),
      template: EmailVerificationTemplate({
        userName: displayName,
        code,
        expiresInMinutes,
      }) as ReactEmailTemplate,
    });

    this.logger.log(`Verification code sent to ${normalizedEmail}`);
  }

  async consumeCode(email: string, code: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await this.verificationRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!record) {
      throw new BadRequestException('请先获取验证码');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.verificationRepository.delete(record.id);
      throw new BadRequestException('验证码已过期，请重新获取');
    }

    if (record.code !== code) {
      throw new BadRequestException('验证码错误');
    }

    await this.verificationRepository.delete(record.id);
  }

  private async ensureRecord(email: string): Promise<EmailVerification> {
    const existing = await this.verificationRepository.findOne({
      where: { email },
    });
    if (existing) {
      return existing;
    }
    return this.verificationRepository.create({
      email,
      code: '',
      expiresAt: new Date(),
    });
  }

  private generateCode(): string {
    const random = Math.floor(Math.random() * 1_000_000);
    return random.toString().padStart(6, '0');
  }

  private getExpireMinutes(): number {
    const raw =
      this.configService.get<string>('EMAIL_VERIFICATION_EXPIRES_MINUTES') ??
      '30';
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 30;
    }
    return parsed;
  }

  private buildText(
    name: string,
    code: string,
    expiresInMinutes: number,
  ): string[] {
    return [
      `您好 ${name}，`,
      '',
      '请使用以下验证码完成邮箱注册：',
      code,
      '',
      `验证码将在 ${expiresInMinutes} 分钟后失效。`,
      '',
      '如果这不是您的操作，请忽略此邮件。',
      '—— MIA 商家智能助手团队',
    ];
  }
}
