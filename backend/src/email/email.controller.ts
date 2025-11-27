import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildSuccessResponse } from '../common/dto/api-response.dto';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: '发送邮件' })
  @ApiBody({
    type: SendEmailDto,
    examples: {
      textEmail: {
        summary: '纯文本邮件',
        value: {
          to: 'demo@example.com',
          subject: '欢迎使用 MIA',
          text: '欢迎使用商家智能助手，这是测试邮件内容。',
        },
      },
      htmlEmail: {
        summary: 'HTML 邮件',
        value: {
          to: 'demo@example.com',
          subject: '新通知',
          html: '<p>您好，<strong>这是 HTML 邮件</strong>。</p>',
          cc: ['manager@example.com'],
          bcc: ['audit@example.com'],
        },
      },
    },
  })
  async send(@Body() payload: SendEmailDto) {
    const result = await this.emailService.sendEmail(payload);
    return buildSuccessResponse(result, 'Email sent');
  }
}
