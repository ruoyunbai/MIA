import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import type {
  EmailMessage,
  EmailPayload,
  ReactEmailTemplate,
} from './interfaces/email-message.interface';

export type EmailSendResult = Pick<
  SentMessageInfo,
  'messageId' | 'accepted' | 'rejected' | 'response' | 'envelope'
>;

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultFrom?: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultFrom =
      this.getConfigValue([
        'EMAIL_FROM',
        'MAIL_FROM',
        'EMAIL_DEFAULT_FROM',
        'EMAIL_SMTP_FROM',
      ]) ??
      this.getConfigValue(['EMAIL_SMTP_USER', 'SMTP_USER']) ??
      undefined;
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const transporter = this.ensureTransporter();
    const payload = await this.preparePayload(message);

    const result = await transporter.sendMail(payload);

    const recipients = Array.isArray(payload.to)
      ? payload.to.join(', ')
      : payload.to;
    this.logger.log(
      `Email queued to ${recipients} with subject "${payload.subject}"`,
    );

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
      envelope: result.envelope,
    };
  }

  async renderTemplate(template: ReactEmailTemplate): Promise<string> {
    return render(template);
  }

  private async preparePayload(message: EmailMessage): Promise<EmailPayload> {
    const from = message.from ?? this.defaultFrom;
    if (!from) {
      throw new Error(
        'Email sender is missing. Configure EMAIL_FROM or pass `from` explicitly.',
      );
    }

    const html =
      message.html ??
      (message.template
        ? await this.renderTemplate(message.template)
        : undefined);

    if (!html && !message.text) {
      throw new Error(
        'Email content is missing. Provide either `text`, `html`, or a `template`.',
      );
    }

    const payload: EmailPayload = {
      to: message.to,
      subject: message.subject,
      text: message.text,
      html,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
      attachments: message.attachments,
      headers: message.headers,
      from,
    };

    return payload;
  }

  private ensureTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host =
      this.getConfigValue(['EMAIL_SMTP_HOST', 'SMTP_HOST']) ?? undefined;
    const port = this.getPort();
    const user =
      this.getConfigValue(['EMAIL_SMTP_USER', 'SMTP_USER', 'EMAIL_USER']) ??
      undefined;
    const pass =
      this.getConfigValue([
        'EMAIL_SMTP_PASS',
        'EMAIL_SMTP_PASSWORD',
        'SMTP_PASS',
        'SMTP_PASSWORD',
        'EMAIL_PASSWORD',
      ]) ?? undefined;
    const secure =
      this.getBooleanValue(
        this.getConfigValue(['EMAIL_SMTP_SECURE', 'SMTP_SECURE']),
      ) ?? port === 465;

    if (!host) {
      throw new Error(
        'SMTP host is not configured. Provide EMAIL_SMTP_HOST (or SMTP_HOST).',
      );
    }

    if (!user || !pass) {
      throw new Error(
        'SMTP credentials are missing. Provide EMAIL_SMTP_USER and EMAIL_SMTP_PASS.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(
      `SMTP transporter configured for ${host}:${port} (secure=${secure})`,
    );

    return this.transporter;
  }

  private getPort() {
    const value =
      this.getConfigValue(['EMAIL_SMTP_PORT', 'SMTP_PORT']) ?? '587';
    const port = Number(value);
    if (Number.isNaN(port)) {
      throw new Error(`Invalid SMTP port value: ${value}`);
    }
    return port;
  }

  private getConfigValue(keys: string[]): string | undefined {
    for (const key of keys) {
      const raw = this.configService.get<string>(key);
      if (typeof raw === 'string' && raw.length > 0) {
        return raw;
      }
    }
    return undefined;
  }

  private getBooleanValue(value: string | undefined): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }
    return ['true', '1', 'yes', 'y', 'on'].includes(value.toLowerCase());
  }
}
